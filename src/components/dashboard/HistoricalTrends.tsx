"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SnapshotHistoryEntry } from "@/types/pnode";
import { formatNumber, formatPercent } from "@/lib/format";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface HistoricalTrendsProps {
  data: SnapshotHistoryEntry[];
  isLoading: boolean;
  error?: string | null;
  onRefresh: () => void;
}

export function HistoricalTrends({ data, isLoading, error, onRefresh }: HistoricalTrendsProps) {
  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-lg shadow-black/20">
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">History</p>
          <h3 className="text-xl font-semibold text-white">Network Trends</h3>
          <p className="text-xs text-slate-500">Rolling snapshots for the default discovery rotation.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:border-white/40"
        >
          <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh history
        </button>
      </header>
      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      ) : null}
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">History populates after the first few refreshes.</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -10, right: 10 }}>
              <defs>
                <linearGradient id="usedArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="committedArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="timestamp" tickFormatter={formatTick} tick={{ fill: "#94a3b8", fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis yAxisId="left" tickFormatter={(value) => `${value.toFixed(1)} TB`} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip content={<HistoryTooltip />} cursor={{ stroke: "rgba(148,163,184,0.2)" }} />
              <Area yAxisId="left" type="monotone" dataKey="committedTb" stroke="#0ea5e9" fill="url(#committedArea)" strokeWidth={2} name="Committed TB" />
              <Area yAxisId="left" type="monotone" dataKey="usedTb" stroke="#34d399" fill="url(#usedArea)" strokeWidth={2} name="Used TB" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.length > 0 ? (
        <dl className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Current nodes</p>
            <p className="text-lg font-semibold text-white">{formatNumber(data[data.length - 1]?.totalNodes ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Usage</p>
            <p className="text-lg font-semibold text-white">{formatPercent(data[data.length - 1]?.avgUsagePercent ?? 0, 2)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Snapshot count</p>
            <p className="text-lg font-semibold text-white">{data.length}</p>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

function formatTick(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function HistoryTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SnapshotHistoryEntry }> }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const timestamp = new Date(entry.timestamp).toLocaleString();
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-white shadow-xl">
      <p className="text-xs text-slate-400">{timestamp}</p>
      <p className="mt-1 text-sm">Used {entry.usedTb.toFixed(2)} TB / {entry.committedTb.toFixed(2)} TB</p>
      <p className="text-xs text-slate-400">Nodes {formatNumber(entry.totalNodes)} · Utilization {formatPercent(entry.avgUsagePercent, 2)}</p>
      <p className="text-xs text-slate-500">Health mix: {entry.healthy} healthy · {entry.warning} warning · {entry.critical} critical</p>
    </div>
  );
}
