import { NextResponse } from "next/server";
import { getPnodeSnapshot } from "@/lib/pnodes";
import { buildExportHeaders, ensureExportAccess } from "@/lib/export-utils";
import type { PNode } from "@/types/pnode";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

type StatusFilter = "healthy" | "warning" | "critical" | "all";

export async function GET(request: Request) {
  const access = ensureExportAccess(request);
  if (!access.ok) {
    return access.response;
  }

  const url = new URL(request.url);
  const statusFilter = normalizeStatus(url.searchParams.get("status"));
  const limit = normalizeLimit(url.searchParams.get("limit"));
  const cursor = url.searchParams.get("cursor");

  try {
    const snapshot = await getPnodeSnapshot().catch((error) => {
      console.error("/api/export/nodes snapshot failure", error);
      return null;
    });
    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot unavailable" }, { status: 503 });
    }

    const filtered = filterNodes(snapshot.nodes, statusFilter);
    const paginated = applyCursor(filtered, cursor, limit);
    const payload = {
      version: "2025.12.24",
      generatedAt: snapshot.fetchedAt,
      data: {
        nodes: paginated.nodes.map((node) => formatNode(node)),
        nextCursor: paginated.nextCursor,
      },
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: { ...buildExportHeaders(), "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("/api/export/nodes", error);
    return NextResponse.json({ error: "Unable to prepare node feed" }, { status: 500 });
  }
}

function normalizeStatus(value: string | null): StatusFilter {
  if (value === "healthy" || value === "warning" || value === "critical") {
    return value;
  }
  return "all";
}

function normalizeLimit(value: string | null): number {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.max(10, Math.min(MAX_LIMIT, Math.round(parsed)));
}

function filterNodes(nodes: PNode[], filter: StatusFilter): PNode[] {
  if (filter === "all") {
    return nodes;
  }
  return nodes.filter((node) => node.status === filter);
}

function applyCursor(nodes: PNode[], cursor: string | null, limit: number) {
  let startIndex = 0;
  if (cursor) {
    const index = nodes.findIndex((node) => node.pubkey === cursor);
    if (index >= 0) {
      startIndex = index + 1;
    }
  }
  const slice = nodes.slice(startIndex, startIndex + limit);
  const nextCursor = slice.length + startIndex < nodes.length ? slice[slice.length - 1]?.pubkey ?? null : null;
  return { nodes: slice, nextCursor };
}

function formatNode(node: PNode) {
  return {
    pubkey: node.pubkey,
    status: node.status,
    uptimeHours: node.uptimeHours,
    storageUsagePercent: node.storageUsagePercent,
    storageCommitted: node.storageCommitted,
    storageUsed: node.storageUsed,
    isPublic: node.isPublic,
    lastSeen: node.lastSeenIso,
    version: node.version,
  };
}
