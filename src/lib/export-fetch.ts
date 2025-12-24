import "server-only";

export interface ExportSummaryResponse {
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

export interface ExportHistoryResponse {
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

export async function fetchSummary(token?: string): Promise<ExportSummaryResponse> {
  const headers = token ? { "x-atlas-token": token } : undefined;
  const baseUrl = resolveExportBaseUrl();
  const response = await fetch(`${baseUrl}/api/export/summary`, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load summary export");
  }
  return response.json();
}

interface HistoryOptions {
  token?: string;
  interval?: string;
  points?: number;
}

export async function fetchHistory(options: HistoryOptions = {}): Promise<ExportHistoryResponse> {
  const { token, interval, points } = options;
  const search = new URLSearchParams();
  if (interval) search.set("interval", interval);
  if (points) search.set("points", String(points));
  const headers = token ? { "x-atlas-token": token } : undefined;
  const baseUrl = resolveExportBaseUrl();
  const response = await fetch(`${baseUrl}/api/export/history?${search.toString()}`, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load history export");
  }
  return response.json();
}

function resolveExportBaseUrl() {
  const explicit = process.env.EXPORT_API_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL;
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
