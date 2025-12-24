"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SnapshotHistoryEntry } from "@/types/pnode";
import { formatNumber, formatPercent } from "@/lib/format";
import { AlertTriangle, Info, RefreshCcw } from "lucide-react";

export type HistoryView = "capacity" | "utilization" | "health";

const VIEW_OPTIONS: { value: HistoryView; label: string }[] = [
  { value: "capacity", label: "Capacity" },
  { value: "utilization", label: "Utilization" },
  { value: "health", label: "Health Mix" },
];

interface HistoricalTrendsProps {
  data: SnapshotHistoryEntry[];
  isLoading: boolean;
  error?: string | null;
  onRefresh: () => void;
  limitOptions?: number[];
  activeLimit?: number;
  onLimitChange?: (next: number) => void;
  view: HistoryView;
  onViewChange: (next: HistoryView) => void;
}

export function HistoricalTrends({ data, isLoading, error, onRefresh, limitOptions = [24, 48, 72], activeLimit, onLimitChange, view, onViewChange }: HistoricalTrendsProps) {
  const latestEntry = data.length ? data[data.length - 1] : null;
  const summaryMetrics = useMemo(() => {
    if (!latestEntry) return [];
    return [
      { label: "Current nodes", value: formatNumber(latestEntry.totalNodes) },
      { label: "Usage", value: formatPercent(latestEntry.avgUsagePercent ?? 0, 2) },
      { label: "Snapshot count", value: String(data.length) },
    ];
  }, [data.length, latestEntry]);
  const hasHistory = data.length > 0;

  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-lg shadow-black/20">
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
             <p className="text-sm uppercase tracking-[0.2em] text-slate-400">History</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-white">Network Trends</h3>
            <SectionInfoTooltip text="Track rolling gossip snapshots for capacity, utilization, and health to spot emerging trends." />
          </div>
          <p className="text-xs text-slate-500">Rolling snapshots for the default discovery rotation.</p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap gap-2 md:justify-end">
            {VIEW_OPTIONS.map((option) => {
              const isActive = view === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onViewChange(option.value)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${isActive ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200" : "border-white/10 text-slate-300 hover:border-white/30"}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {limitOptions.length ? (
            <div className="flex flex-wrap gap-2 md:justify-end">
              {limitOptions.map((limit) => {
                const selected = activeLimit ? activeLimit === limit : false;
                return (
                  <button
                    key={limit}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onLimitChange?.(limit)}
                    className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${selected ? "border-sky-400/60 bg-sky-500/10 text-sky-200" : "border-white/10 text-slate-400 hover:border-white/30"}`}
                  >
                    Last {limit}
                  </button>
                );
              })}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:border-white/40"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh history
          </button>
        </div>
      </header>
      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      ) : null}
      {!hasHistory ? (
        <p className="mt-4 text-sm text-slate-400">History populates after the first few refreshes.</p>
      ) : (
        <div className="h-72 w-full">
          {view === "capacity" ? <CapacityChart data={data} /> : null}
          {view === "utilization" ? <UtilizationChart data={data} /> : null}
          {view === "health" ? <HealthChart data={data} /> : null}
        </div>
      )}
      {summaryMetrics.length ? (
        <dl className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
          {summaryMetrics.map((metric) => (
            <div key={metric.label}>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{metric.label}</p>
              <p className="text-lg font-semibold text-white">{metric.value}</p>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

function SectionInfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="rounded-full border border-transparent p-1 text-slate-500 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        aria-label={text}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-0 z-20 hidden w-64 -translate-x-1/2 -translate-y-[140%] rounded-2xl border border-white/10 bg-slate-950/95 px-3 py-2 text-left text-[11px] leading-relaxed text-slate-100 shadow-2xl group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}

function formatTick(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface ChartProps {
  data: SnapshotHistoryEntry[];
}

function CapacityChart({ data }: ChartProps) {
  return (
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
        <Tooltip content={<CapacityTooltip />} cursor={{ stroke: "rgba(148,163,184,0.2)" }} />
        <Area yAxisId="left" type="monotone" dataKey="committedTb" stroke="#0ea5e9" fill="url(#committedArea)" strokeWidth={2} name="Committed TB" />
        <Area yAxisId="left" type="monotone" dataKey="usedTb" stroke="#34d399" fill="url(#usedArea)" strokeWidth={2} name="Used TB" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function UtilizationChart({ data }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -10, right: 10 }}>
        <defs>
          <linearGradient id="usageArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
        <XAxis dataKey="timestamp" tickFormatter={formatTick} tick={{ fill: "#94a3b8", fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis
          yAxisId="left"
          domain={[0, 100]}
          tickFormatter={(value) => `${value.toFixed(0)}%`}
          tick={{ fill: "#94a3b8", fontSize: 12 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(value) => formatNumber(value)}
          tick={{ fill: "#94a3b8", fontSize: 12 }}
        />
        <Tooltip content={<UtilizationTooltip />} cursor={{ stroke: "rgba(148,163,184,0.2)" }} />
        <Area yAxisId="left" type="monotone" dataKey="avgUsagePercent" stroke="#a855f7" strokeWidth={2} fill="url(#usageArea)" name="Avg usage" />
        <Line yAxisId="right" type="monotone" dataKey="totalNodes" stroke="#38bdf8" strokeWidth={2} dot={false} name="Total nodes" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function HealthChart({ data }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -10, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
        <XAxis dataKey="timestamp" tickFormatter={formatTick} tick={{ fill: "#94a3b8", fontSize: 12 }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis yAxisId="left" allowDecimals={false} tickFormatter={(value) => formatNumber(value)} tick={{ fill: "#94a3b8", fontSize: 12 }} />
        <Tooltip content={<HealthTooltip />} cursor={{ stroke: "rgba(148,163,184,0.2)" }} />
        <Area yAxisId="left" type="monotone" dataKey="healthy" stackId="health" stroke="#10b981" fill="#10b981" fillOpacity={0.35} name="Healthy" />
        <Area yAxisId="left" type="monotone" dataKey="warning" stackId="health" stroke="#f97316" fill="#f97316" fillOpacity={0.3} name="Warning" />
        <Area yAxisId="left" type="monotone" dataKey="critical" stackId="health" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.28} name="Critical" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CapacityTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SnapshotHistoryEntry }> }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const timestamp = new Date(entry.timestamp).toLocaleString();
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-white shadow-xl">
      <p className="text-xs text-slate-400">{timestamp}</p>
      <p className="mt-1 text-sm">Used {entry.usedTb.toFixed(2)} TB / {entry.committedTb.toFixed(2)} TB</p>
      <p className="text-xs text-slate-400">Nodes {formatNumber(entry.totalNodes)} · Utilization {formatPercent(entry.avgUsagePercent, 2)}</p>
    </div>
  );
}

function UtilizationTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SnapshotHistoryEntry }> }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const timestamp = new Date(entry.timestamp).toLocaleString();
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-white shadow-xl">
      <p className="text-xs text-slate-400">{timestamp}</p>
      <p className="mt-1 text-sm">Average utilization {formatPercent(entry.avgUsagePercent, 2)}</p>
      <p className="text-xs text-slate-400">Total nodes {formatNumber(entry.totalNodes)}</p>
    </div>
  );
}

function HealthTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SnapshotHistoryEntry }> }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const timestamp = new Date(entry.timestamp).toLocaleString();
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-white shadow-xl">
      <p className="text-xs text-slate-400">{timestamp}</p>
      <p className="mt-1 text-sm">{formatNumber(entry.healthy)} healthy · {formatNumber(entry.warning)} warning · {formatNumber(entry.critical)} critical</p>
      <p className="text-xs text-slate-400">Nodes {formatNumber(entry.totalNodes)}</p>
    </div>
  );
}
