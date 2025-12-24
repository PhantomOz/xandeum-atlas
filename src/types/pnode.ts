export interface RawPod {
  address?: string | null;
  is_public?: boolean | null;
  last_seen_timestamp?: number | null;
  pubkey?: string | null;
  rpc_port?: number | null;
  storage_committed?: number | null;
  storage_usage_percent?: number | null;
  storage_used?: number | null;
  uptime?: number | null;
  version?: string | null;
}

export interface PodsPayload {
  pods?: RawPod[];
  total_count?: number;
}

export type NodeStatus = "healthy" | "warning" | "critical";

export type ReleaseChannel = "mainnet" | "trynet" | "devnet" | "unknown";

export interface PNode {
  pubkey: string;
  address: string | null;
  ip: string | null;
  gossipPort: number | null;
  rpcPort: number | null;
  isPublic: boolean;
  version: string;
  channel: ReleaseChannel;
  uptimeSeconds: number;
  uptimeHours: number;
  lastSeenSeconds: number;
  lastSeenIso: string;
  storageCommitted: number;
  storageUsed: number;
  storageFree: number;
  storageUsagePercent: number;
  healthScore: number;
  status: NodeStatus;
  isStale: boolean;
}

export interface VersionDistributionEntry {
  version: string;
  count: number;
  percentage: number;
}

export interface UsageBucket {
  label: string;
  nodes: number;
  percentage: number;
}

export interface StorageLeader {
  pubkey: string;
  shortKey: string;
  address: string | null;
  usedTb: number;
  committedTb: number;
  usagePercent: number;
  version: string;
  isPublic: boolean;
  status: NodeStatus;
}

export interface AnalyticsMetrics {
  totalNodes: number;
  publicNodes: number;
  privateNodes: number;
  avgUptimeHours: number;
  maxUptimeHours: number;
  committedTb: number;
  usedTb: number;
  avgUsagePercent: number;
  latestVersion: string;
  outdatedNodes: number;
  healthy: number;
  warning: number;
  critical: number;
  stale: number;
  versionDistribution: VersionDistributionEntry[];
  usageBuckets: UsageBucket[];
  storageLeaders: StorageLeader[];
}

export interface PNodeSnapshot {
  nodes: PNode[];
  metrics: AnalyticsMetrics;
  fetchedAt: string;
  seed: string;
}

export interface SnapshotHistoryEntry {
  timestamp: string;
  totalNodes: number;
  usedTb: number;
  committedTb: number;
  avgUsagePercent: number;
  healthy: number;
  warning: number;
  critical: number;
}
