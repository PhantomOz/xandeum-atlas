import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { recordSnapshotMetrics } from "@/lib/history";
import type {
  AnalyticsMetrics,
  PNode,
  PNodeSnapshot,
  PodsPayload,
  RawPod,
  StorageLeader,
  UsageBucket,
  VersionDistributionEntry,
} from "@/types/pnode";

const DEFAULT_SEEDS = [
  "173.212.220.65",
  "161.97.97.41",
  "192.190.136.36",
  "192.190.136.38",
  "207.244.255.1",
  "192.190.136.28",
  "192.190.136.29",
  "173.212.203.145",
];

const RPC_PORT = Number(process.env.PNODE_RPC_PORT ?? 6000);
const CACHE_TTL_MS = Number(process.env.PNODE_CACHE_TTL ?? 25000);
const REQUEST_TIMEOUT_MS = Number(process.env.PNODE_REQUEST_TIMEOUT ?? 7000);
const STALE_THRESHOLD_SECONDS = Number(process.env.PNODE_STALE_SECONDS ?? 1800);
const TB = 1024 ** 4;

interface CachedSnapshot {
  snapshot: PNodeSnapshot;
  expiresAt: number;
}

const snapshotCache = new Map<string, CachedSnapshot>();

type BaseNode = Omit<PNode, "healthScore" | "status"> & {
  versionValue: number;
};

interface SnapshotOptions {
  forceRefresh?: boolean;
  customSeeds?: string[];
}

export async function getPnodeSnapshot(options?: SnapshotOptions): Promise<PNodeSnapshot> {
  const normalizedCustomSeeds = normalizeSeedList(options?.customSeeds);
  const cacheKey = buildCacheKey(normalizedCustomSeeds);
  const now = Date.now();
  const cached = snapshotCache.get(cacheKey);
  if (!options?.forceRefresh && cached && cached.expiresAt > now) {
    return cached.snapshot;
  }

  const { pods, seed } = await fetchFromNetwork(normalizedCustomSeeds);
  const baseNodes = normalizePods(pods);
  const { latestLabel, latestValue } = determineLatestVersion(baseNodes);
  const nodes = finalizeNodes(baseNodes, latestValue);
  const metrics = buildAnalytics(nodes, latestLabel);

  const snapshot: PNodeSnapshot = {
    nodes,
    metrics,
    fetchedAt: new Date().toISOString(),
    seed,
  };

  snapshotCache.set(cacheKey, {
    snapshot,
    expiresAt: now + CACHE_TTL_MS,
  });

  const shouldRecordHistory = cacheKey === "default";
  if (shouldRecordHistory) {
    recordSnapshotMetrics(snapshot).catch((error) => {
      console.error("Failed to append snapshot history", error);
    });
  }

  return snapshot;
}

async function fetchFromNetwork(customSeeds?: string[]): Promise<{ pods: RawPod[]; seed: string }> {
  const seeds = resolveSeeds(customSeeds);
  const errors: string[] = [];

  for (const seed of seeds) {
    try {
      const pods = await fetchFromSeed(seed);
      if (pods.length === 0) {
        throw new Error("Seed returned no pods");
      }
      return { pods, seed };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${seed}: ${message}`);
    }
  }

  throw new Error(`Unable to discover pNodes via pRPC. Tried: ${errors.join(" | ")}`);
}

function resolveSeeds(customSeeds?: string[]): string[] {
  const normalizedCustomSeeds = normalizeSeedList(customSeeds);
  if (normalizedCustomSeeds && normalizedCustomSeeds.length > 0) {
    return normalizedCustomSeeds;
  }
  const envSeeds = normalizeSeedList(process.env.PNODE_SEEDS?.split(","));
  if (envSeeds && envSeeds.length > 0) {
    return envSeeds;
  }
  return DEFAULT_SEEDS;
}

async function fetchFromSeed(seed: string): Promise<RawPod[]> {
  try {
    const payload = await callRpc(seed, "get-pods-with-stats");
    if (payload?.pods && payload.pods.length > 0) {
      return payload.pods;
    }
  } catch (error) {
    // Fall through to try the lighter method
    if (process.env.NODE_ENV === "development") {
      console.warn(`get-pods-with-stats failed for ${seed}:`, error);
    }
  }

  const fallbackPayload = await callRpc(seed, "get-pods");
  return fallbackPayload?.pods ?? [];
}

async function callRpc(seed: string, method: string): Promise<PodsPayload> {
  const url = buildSeedUrl(seed);
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: Date.now(),
    method,
  });
  const rawResponse = await postJson(url, payload);
  let parsed: { result?: PodsPayload; error?: { message?: string } };
  try {
    parsed = JSON.parse(rawResponse) as { result?: PodsPayload; error?: { message?: string } };
  } catch (error) {
    throw new Error(`Invalid JSON from ${url}: ${(error as Error).message}`);
  }

  if (parsed.error) {
    throw new Error(parsed.error.message ?? "Unknown pRPC error");
  }

  return parsed.result ?? { pods: [] };
}

function postJson(urlString: string, payload: string): Promise<string> {
  const target = new URL(urlString);
  const isHttps = target.protocol === "https:";
  const requester = isHttps ? httpsRequest : httpRequest;
  const port = target.port ? Number(target.port) : undefined;

  return new Promise((resolve, reject) => {
    const req = requester(
      {
        hostname: target.hostname,
        port,
        path: `${target.pathname}${target.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload).toString(),
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer | string) => {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        });
        res.on("end", () => {
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
        res.on("error", reject);
      },
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error("pRPC request timed out"));
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function buildSeedUrl(seed: string): string {
  const trimmed = seed.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.endsWith("/rpc") ? trimmed : `${trimmed.replace(/\/$/, "")}/rpc`;
  }

  const [host, explicitPort] = trimmed.split(":");
  const port = explicitPort ? Number(explicitPort) : RPC_PORT;
  return `http://${host}:${port}/rpc`;
}

function normalizePods(pods: RawPod[]): BaseNode[] {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const deduped = new Map<string, BaseNode>();

  for (const pod of pods) {
    const pubkey = pod.pubkey?.trim();
    if (!pubkey) continue;

    const { ip, port } = splitAddress(pod.address ?? undefined);
    const committed = sanitizeNumber(pod.storage_committed);
    const used = sanitizeNumber(pod.storage_used);
    const usagePercent = resolveUsagePercent(committed, used, pod.storage_usage_percent);

    const base: BaseNode = {
      pubkey,
      address: pod.address ?? null,
      ip,
      gossipPort: port,
      rpcPort: typeof pod.rpc_port === "number" ? pod.rpc_port : null,
      isPublic: Boolean(pod.is_public),
      version: pod.version?.trim() || "unknown",
      channel: resolveChannel(pod.version),
      uptimeSeconds: sanitizeNumber(pod.uptime),
      uptimeHours: sanitizeNumber(pod.uptime) / 3600,
      lastSeenSeconds: sanitizeNumber(pod.last_seen_timestamp),
      lastSeenIso: new Date(sanitizeNumber(pod.last_seen_timestamp) * 1000).toISOString(),
      storageCommitted: committed,
      storageUsed: used,
      storageFree: Math.max(committed - used, 0),
      storageUsagePercent: usagePercent,
      isStale: nowSeconds - sanitizeNumber(pod.last_seen_timestamp) > STALE_THRESHOLD_SECONDS,
      versionValue: versionToNumber(pod.version),
    };

    const existing = deduped.get(pubkey);
    if (!existing || base.lastSeenSeconds > existing.lastSeenSeconds) {
      deduped.set(pubkey, base);
    }
  }

  return [...deduped.values()];
}

function determineLatestVersion(nodes: BaseNode[]): { latestLabel: string; latestValue: number } {
  if (nodes.length === 0) {
    return { latestLabel: "unknown", latestValue: 0 };
  }

  let latest = nodes[0];
  for (const node of nodes) {
    if (node.versionValue > latest.versionValue) {
      latest = node;
    }
  }
  return { latestLabel: latest.version, latestValue: latest.versionValue };
}

function finalizeNodes(nodes: BaseNode[], latestVersionValue: number): PNode[] {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nodes.map((node) => {
    const healthScore = computeHealthScore(node, latestVersionValue, nowSeconds);
    const status = deriveStatus(healthScore, node.isStale);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { versionValue, ...rest } = node;
    return {
      ...rest,
      healthScore,
      status,
    };
  });
}

function computeHealthScore(node: BaseNode, latestVersionValue: number, nowSeconds: number): number {
  const uptimeScore = Math.min(node.uptimeSeconds / (7 * 24 * 3600), 1);
  const usageScore = 1 - Math.min(node.storageUsagePercent / 90, 1);
  const freshnessLag = Math.max(nowSeconds - node.lastSeenSeconds, 0);
  const freshnessScore = 1 - Math.min(freshnessLag / (STALE_THRESHOLD_SECONDS * 2), 1);
  const versionScore = latestVersionValue > 0 ? Math.min(node.versionValue / latestVersionValue, 1) : 1;
  const exposureScore = node.isPublic ? 1 : 0.88;

  const score =
    uptimeScore * 0.32 +
    freshnessScore * 0.28 +
    usageScore * 0.18 +
    versionScore * 0.12 +
    exposureScore * 0.1;

  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

function deriveStatus(health: number, isStale: boolean) {
  if (isStale) return "critical" as const;
  if (health >= 80) return "healthy" as const;
  if (health >= 55) return "warning" as const;
  return "critical" as const;
}

function buildAnalytics(nodes: PNode[], latestVersion: string): AnalyticsMetrics {
  const totalNodes = nodes.length || 1;
  const publicNodes = nodes.filter((node) => node.isPublic).length;
  const privateNodes = nodes.length - publicNodes;
  const committedSum = nodes.reduce((sum, node) => sum + node.storageCommitted, 0);
  const usedSum = nodes.reduce((sum, node) => sum + node.storageUsed, 0);
  const avgUptimeHours = nodes.reduce((sum, node) => sum + node.uptimeHours, 0) / totalNodes;
  const maxUptimeHours = nodes.reduce((max, node) => Math.max(max, node.uptimeHours), 0);
  const avgUsagePercent = nodes.reduce((sum, node) => sum + node.storageUsagePercent, 0) / totalNodes;
  const healthy = nodes.filter((node) => node.status === "healthy").length;
  const warning = nodes.filter((node) => node.status === "warning").length;
  const critical = nodes.filter((node) => node.status === "critical").length;
  const stale = nodes.filter((node) => node.isStale).length;

  const versionDistribution = buildVersionDistribution(nodes);
  const usageBuckets = buildUsageBuckets(nodes);
  const storageLeaders = buildStorageLeaders(nodes);
  const outdatedNodes = nodes.filter((node) => node.version !== latestVersion).length;

  return {
    totalNodes: nodes.length,
    publicNodes,
    privateNodes,
    avgUptimeHours,
    maxUptimeHours,
    committedTb: committedSum / TB,
    usedTb: usedSum / TB,
    avgUsagePercent,
    latestVersion,
    outdatedNodes,
    healthy,
    warning,
    critical,
    stale,
    versionDistribution,
    usageBuckets,
    storageLeaders,
  };
}

function buildVersionDistribution(nodes: PNode[]): VersionDistributionEntry[] {
  const map = new Map<string, number>();
  for (const node of nodes) {
    map.set(node.version, (map.get(node.version) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([version, count]) => ({
      version,
      count,
      percentage: nodes.length ? (count / nodes.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

const USAGE_BUCKETS = [
  { label: "< 0.01%", predicate: (value: number) => value < 0.01 },
  { label: "0.01% - 0.1%", predicate: (value: number) => value >= 0.01 && value < 0.1 },
  { label: "0.1% - 1%", predicate: (value: number) => value >= 0.1 && value < 1 },
  { label: "1% - 5%", predicate: (value: number) => value >= 1 && value < 5 },
  { label: "> 5%", predicate: (value: number) => value >= 5 },
];

function buildUsageBuckets(nodes: PNode[]): UsageBucket[] {
  return USAGE_BUCKETS.map((bucket) => {
    const count = nodes.filter((node) => bucket.predicate(node.storageUsagePercent)).length;
    return {
      label: bucket.label,
      nodes: count,
      percentage: nodes.length ? (count / nodes.length) * 100 : 0,
    };
  });
}

function buildStorageLeaders(nodes: PNode[]): StorageLeader[] {
  return nodes
    .filter((node) => node.storageUsed > 0)
    .sort((a, b) => b.storageUsed - a.storageUsed)
    .slice(0, 6)
    .map((node) => ({
      pubkey: node.pubkey,
      shortKey: abbreviate(node.pubkey),
      address: node.address,
      usedTb: node.storageUsed / TB,
      committedTb: node.storageCommitted / TB,
      usagePercent: node.storageUsagePercent,
      version: node.version,
      isPublic: node.isPublic,
      status: node.status,
    }));
}

function abbreviate(value: string): string {
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function splitAddress(address?: string) {
  if (!address) {
    return { ip: null, port: null };
  }
  const [ip, port] = address.split(":");
  return {
    ip: ip || null,
    port: port ? Number(port) : null,
  };
}

function sanitizeNumber(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
}

function resolveUsagePercent(committed: number, used: number, provided?: number | null): number {
  if (typeof provided === "number" && provided > 0) {
    return provided <= 1 ? provided * 100 : provided;
  }
  if (committed > 0 && used > 0) {
    return (used / committed) * 100;
  }
  return 0;
}

function resolveChannel(version?: string | null) {
  if (!version) return "unknown" as const;
  if (version.toLowerCase().includes("trynet")) return "trynet" as const;
  if (version.toLowerCase().includes("dev")) return "devnet" as const;
  return "mainnet" as const;
}

function versionToNumber(version?: string | null): number {
  if (!version) return 0;
  const clean = version.split("-")[0];
  const [major, minor, patch] = clean.split(".").map((segment) => Number(segment) || 0);
  return major * 1e6 + minor * 1e3 + patch;
}

function normalizeSeedList(seeds?: string[] | null): string[] | undefined {
  if (!seeds) return undefined;
  const normalized = seeds.map((seed) => seed.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function buildCacheKey(seeds?: string[]) {
  if (!seeds || seeds.length === 0) {
    return "default";
  }
  return seeds.join(",");
}
