import { NextResponse } from "next/server";
import { getSnapshotHistory } from "@/lib/history";
import { buildExportHeaders, downsampleHistory, ensureExportAccess, formatHistoryPayload } from "@/lib/export-utils";

const DEFAULT_INTERVAL: IntervalOption = "1h";
const DEFAULT_POINTS = 48;
const MAX_POINTS = 168;

type IntervalOption = "1h" | "6h" | "24h";

export async function GET(request: Request) {
  const access = ensureExportAccess(request);
  if (!access.ok) {
    return access.response;
  }

  try {
    const url = new URL(request.url);
    const interval = normalizeInterval(url.searchParams.get("interval"));
    const points = normalizePoints(url.searchParams.get("points"));
    const history = await getSnapshotHistory(points * 4);
    const sampled = downsampleHistory(history, interval, points);
    const payload = formatHistoryPayload(history, interval, sampled);
    return NextResponse.json(payload, {
      status: 200,
      headers: buildExportHeaders(),
    });
  } catch (error) {
    console.error("/api/export/history", error);
    return NextResponse.json({ error: "Unable to prepare history" }, { status: 500 });
  }
}

function normalizeInterval(value: string | null): IntervalOption {
  if (value === "6h" || value === "24h") {
    return value;
  }
  return DEFAULT_INTERVAL;
}

function normalizePoints(value: string | null): number {
  if (!value) return DEFAULT_POINTS;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_POINTS;
  }
  return Math.max(12, Math.min(MAX_POINTS, Math.round(parsed)));
}
