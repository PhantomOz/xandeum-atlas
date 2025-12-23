"use client";

import type { UsageBucket } from "@/types/pnode";
import { formatPercent } from "@/lib/format";
import { Info } from "lucide-react";

interface UsageBandsProps {
  data: UsageBucket[];
}

export function UsageBands({ data }: UsageBandsProps) {
  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-lg shadow-black/20">
      <header className="mb-4">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Capacity Bands</p>
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-white">Storage Utilization</h3>
          <InfoTooltip text="Usage buckets show how much of their committed storage pNodes are using. Hover a band to see details." />
        </div>
      </header>
      <ul className="space-y-4">
        {data.map((band) => (
          <li key={band.label} className="group relative">
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
            <BandTooltip label={band.label} nodes={band.nodes} percentage={band.percentage} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BandTooltip({ label, nodes, percentage }: { label: string; nodes: number; percentage: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-full z-10 mt-3 hidden rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-xs leading-relaxed text-slate-100 shadow-2xl group-hover:block">
      {nodes === 0
        ? `0 nodes currently fall into the ${label} usage band.`
        : `${nodes} node${nodes === 1 ? "" : "s"} are using ${label} of their committed storage, representing ${percentage.toFixed(1)}% of the fleet.`}
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="rounded-full border border-transparent p-1 text-slate-500 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        aria-label={text}
      >
        <Info className="h-4 w-4" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-0 z-20 hidden w-64 -translate-x-1/2 -translate-y-[140%] rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-left text-[11px] leading-relaxed text-slate-100 shadow-2xl group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}
