import { NextResponse } from "next/server";
import type { PNodeSnapshot, SnapshotHistoryEntry } from "@/types/pnode";

const EXPORT_VERSION = "2025.12.24";
const EXPORT_TOKEN = process.env.EXPORT_API_TOKEN?.trim();
const CACHE_TTL_SECONDS = 60;

interface ExportAccessResult {
  ok: boolean;
  response: NextResponse;
}

interface SummaryPayload {
  version: string;
  generatedAt: string;
  data: {
    totalNodes: number;
    publicNodes: number;
    privateNodes: number;
    healthy: number;
    warning: number;
    critical: number;
    avgUsagePercent: number;
    committedTb: number;
    usedTb: number;
    latestVersion: string;
    stale: number;
  };
}

interface HistoryPayload {
  version: string;
  generatedAt: string;
  data: {
    interval: string;
    points: Array<{
      timestamp: string;
      totalNodes: number;
      healthy: number;
      critical: number;
      avgUsagePercent: number;
    }>;
  };
}

export function ensureExportAccess(request: Request): ExportAccessResult {
  if (!EXPORT_TOKEN) {
    return { ok: true, response: NextResponse.next() };
  }
  const headerToken = request.headers.get("x-atlas-token")?.trim();
  const queryToken = new URL(request.url).searchParams.get("atlasToken")?.trim();
  if (headerToken === EXPORT_TOKEN || queryToken === EXPORT_TOKEN) {
    return { ok: true, response: NextResponse.next() };
  }
  return {
    ok: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

export function buildExportHeaders() {
  return {
    "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
  };
}

export function formatSummaryPayload(snapshot: PNodeSnapshot): SummaryPayload {
  return {
    version: EXPORT_VERSION,
    generatedAt: snapshot.fetchedAt,
    data: {
      totalNodes: snapshot.metrics.totalNodes,
      publicNodes: snapshot.metrics.publicNodes,
      privateNodes: snapshot.metrics.privateNodes,
      healthy: snapshot.metrics.healthy,
      warning: snapshot.metrics.warning,
      critical: snapshot.metrics.critical,
      avgUsagePercent: snapshot.metrics.avgUsagePercent,
      committedTb: snapshot.metrics.committedTb,
      usedTb: snapshot.metrics.usedTb,
      latestVersion: snapshot.metrics.latestVersion,
      stale: snapshot.metrics.stale,
    },
  };
}

export function formatHistoryPayload(
  entries: SnapshotHistoryEntry[],
  interval: string,
  points: Array<{
    timestamp: string;
    totalNodes: number;
    healthy: number;
    critical: number;
    avgUsagePercent: number;
  }>,
): HistoryPayload {
  const generatedAt = points.length ? points[points.length - 1].timestamp : new Date().toISOString();
  return {
    version: EXPORT_VERSION,
    generatedAt,
    data: {
      interval,
      points,
    },
  };
}

export function downsampleHistory(
  history: SnapshotHistoryEntry[],
  interval: "1h" | "6h" | "24h",
  maxPoints: number,
) {
  if (!history.length) {
    return [];
  }
  let step = 1;
  switch (interval) {
    case "1h":
      step = Math.max(1, Math.floor(history.length / maxPoints));
      break;
    case "6h":
      step = Math.max(1, Math.floor((history.length * 1.5) / maxPoints));
      break;
    case "24h":
      step = Math.max(1, Math.floor((history.length * 3) / maxPoints));
      break;
  }

  const sampled: SnapshotHistoryEntry[] = [];
  for (let index = Math.max(history.length - step * maxPoints, 0); index < history.length; index += step) {
    sampled.push(history[index]);
  }

  return sampled.map((entry) => ({
    timestamp: entry.timestamp,
    totalNodes: entry.totalNodes,
    healthy: entry.healthy,
    warning: entry.warning,
    critical: entry.critical,
    avgUsagePercent: entry.avgUsagePercent,
  }));
}
