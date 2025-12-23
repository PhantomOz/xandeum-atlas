"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Download, Filter } from "lucide-react";
import type { PNode } from "@/types/pnode";
import { abbreviateKey, formatDuration, formatPercent, formatRelativeTimeFromSeconds } from "@/lib/format";
import { PNodeDrawer } from "./PNodeDrawer";

interface PNodeTableProps {
  nodes: PNode[];
  lastUpdated: string;
}

type SortKey = "health" | "uptime" | "usage" | "lastSeen";
type StatusFilter = "all" | "healthy" | "warning" | "critical";
type ExposureFilter = "all" | "public" | "private";

export function PNodeTable({ nodes, lastUpdated }: PNodeTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [exposureFilter, setExposureFilter] = useState<ExposureFilter>("all");
  const [versionFilter, setVersionFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("health");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedNode, setSelectedNode] = useState<PNode | null>(null);

  const versions = useMemo(() => Array.from(new Set(nodes.map((node) => node.version))).sort(), [nodes]);

  const filtered = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    return nodes
      .filter((node) => {
        if (statusFilter !== "all" && node.status !== statusFilter) return false;
        if (exposureFilter === "public" && !node.isPublic) return false;
        if (exposureFilter === "private" && node.isPublic) return false;
        if (versionFilter !== "all" && node.version !== versionFilter) return false;
        if (!lowered) return true;
        return (
          node.pubkey.toLowerCase().includes(lowered) ||
          node.address?.toLowerCase().includes(lowered) ||
          node.ip?.includes(lowered)
        );
      })
      .sort((a, b) => {
        const direction = sortDir === "asc" ? 1 : -1;
        switch (sortKey) {
          case "uptime":
            return (a.uptimeSeconds - b.uptimeSeconds) * direction;
          case "usage":
            return (a.storageUsagePercent - b.storageUsagePercent) * direction;
          case "lastSeen":
            return (a.lastSeenSeconds - b.lastSeenSeconds) * direction;
          case "health":
          default:
            return (a.healthScore - b.healthScore) * direction;
        }
      });
  }, [nodes, search, statusFilter, exposureFilter, versionFilter, sortDir, sortKey]);

  const handleSortChange = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const openDrawer = (node: PNode) => {
    setSelectedNode(node);
  };

  const closeDrawer = () => setSelectedNode(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `xandeum-pnodes-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const header = ["pubkey", "address", "version", "isPublic", "health", "uptime_seconds", "usage_percent", "last_seen_seconds"];
    const rows = filtered.map((node) => [
      node.pubkey,
      node.address ?? "",
      node.version,
      node.isPublic ? "public" : "private",
      node.healthScore,
      node.uptimeSeconds,
      node.storageUsagePercent.toFixed(6),
      node.lastSeenSeconds,
    ]);
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `xandeum-pnodes-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4 rounded-3xl border border-white/5 bg-slate-950/60 p-5 shadow-2xl shadow-black/30">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Explorer</p>
          <h3 className="text-2xl font-semibold text-white">pNode Directory</h3>
          <p className="text-xs text-slate-500">Last synced {new Date(lastUpdated).toLocaleTimeString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportJson} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:border-white/30">
            <Download className="h-4 w-4" /> JSON
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:border-white/30">
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </header>

      <div className="grid gap-3 rounded-2xl border border-white/5 bg-slate-900/40 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-slate-500" />
            <input
              className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 focus:outline-none"
              placeholder="Search pubkey or address"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2 text-sm text-slate-300"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Any status</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <select
            className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2 text-sm text-slate-300"
            value={exposureFilter}
            onChange={(event) => setExposureFilter(event.target.value as ExposureFilter)}
          >
            <option value="all">Exposure: All</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <select className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2 text-sm text-slate-300" value={versionFilter} onChange={(event) => setVersionFilter(event.target.value)}>
            <option value="all">Version: Any</option>
            {versions.map((version) => (
              <option key={version} value={version}>
                {version}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[2.2fr_repeat(6,minmax(120px,1fr))] gap-4 border-b border-white/5 pb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            <span>Node</span>
            <SortButton label="Health" active={sortKey === "health"} onSort={() => handleSortChange("health")} />
            <span>Exposure</span>
            <SortButton label="Version" />
            <SortButton label="Storage" active={sortKey === "usage"} onSort={() => handleSortChange("usage")} />
            <SortButton label="Uptime" active={sortKey === "uptime"} onSort={() => handleSortChange("uptime")} />
            <SortButton label="Last Seen" active={sortKey === "lastSeen"} onSort={() => handleSortChange("lastSeen")} />
          </div>
          <div className="divide-y divide-white/5">
            {filtered.map((node) => (
              <article
                key={node.pubkey}
                role="button"
                tabIndex={0}
                onClick={() => openDrawer(node)}
                onKeyUp={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    openDrawer(node);
                  }
                }}
                className="grid cursor-pointer grid-cols-[2.2fr_repeat(6,minmax(120px,1fr))] items-center gap-4 py-4 text-sm text-slate-100 transition hover:bg-white/5 focus:outline focus:outline-emerald-400/40"
              >
                <div>
                  <p className="font-mono text-base text-white">{abbreviateKey(node.pubkey, 6)}</p>
                  <p className="text-xs text-slate-500">{node.address ?? "private"}</p>
                </div>
                <HealthBadge score={node.healthScore} status={node.status} />
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{node.isPublic ? "Public" : "Private"}</span>
                <span>{node.version}</span>
                <div>
                  <p>{formatPercent(node.storageUsagePercent, 3)}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${node.status === "critical" ? "bg-rose-500" : node.status === "warning" ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${Math.min(node.storageUsagePercent, 100)}%` }}
                    />
                  </div>
                </div>
                <span>{formatDuration(node.uptimeSeconds)}</span>
                <span>{formatRelativeTimeFromSeconds(node.lastSeenSeconds)}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
      <PNodeDrawer node={selectedNode} onClose={closeDrawer} />
    </section>
  );
}

function SortButton({ label, active, onSort }: { label: string; active?: boolean; onSort?: () => void }) {
  return (
    <button
      type="button"
      onClick={onSort}
      className={`inline-flex items-center gap-1 text-left ${active ? "text-white" : "text-slate-400"}`}
    >
      {label}
      {onSort ? <ArrowUpDown className="h-3.5 w-3.5" /> : null}
    </button>
  );
}

function HealthBadge({ score, status }: { score: number; status: PNode["status"] }) {
  const palette =
    status === "critical"
      ? "bg-rose-500/10 text-rose-200"
      : status === "warning"
        ? "bg-amber-500/10 text-amber-200"
        : "bg-emerald-500/10 text-emerald-200";

  return (
    <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold ${palette}`}>
      {score}
    </span>
  );
}
