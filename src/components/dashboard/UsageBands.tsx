"use client";

import type { UsageBucket } from "@/types/pnode";
import { formatPercent } from "@/lib/format";

interface UsageBandsProps {
  data: UsageBucket[];
}

export function UsageBands({ data }: UsageBandsProps) {
  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-lg shadow-black/20">
      <header className="mb-4">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Capacity Bands</p>
        <h3 className="text-xl font-semibold text-white">Storage Utilization</h3>
      </header>
      <ul className="space-y-4">
        {data.map((band) => (
          <li key={band.label}>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>{band.label}</span>
              <span>
                {band.nodes} nodes · {formatPercent(band.percentage, 1)}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500"
                style={{ width: `${band.percentage}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
