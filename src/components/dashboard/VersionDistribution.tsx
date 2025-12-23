"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import type { VersionDistributionEntry } from "@/types/pnode";
import { formatPercent } from "@/lib/format";

interface VersionDistributionProps {
  data: VersionDistributionEntry[];
}

export function VersionDistribution({ data }: VersionDistributionProps) {
  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-lg shadow-black/20">
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Release Mix</p>
          <h3 className="text-xl font-semibold text-white">Version Distribution</h3>
        </div>
        <span className="text-xs text-slate-400">Top {data.length}</span>
      </header>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -20 }}>
            <XAxis dataKey="version" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<VersionTooltip />} cursor={{ fill: "rgba(148,163,184,0.1)" }} />
            <Bar dataKey="percentage" fill="url(#versionGradient)" radius={[8, 8, 0, 0]} />
            <defs>
              <linearGradient id="versionGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function VersionTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: VersionDistributionEntry }> }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/90 px-4 py-2 text-sm text-white shadow-xl">
      <p className="font-semibold">{entry.payload.version}</p>
      <p className="text-slate-300">{formatPercent(entry.value ?? 0)}</p>
    </div>
  );
}
