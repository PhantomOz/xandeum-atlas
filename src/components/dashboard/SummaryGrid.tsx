"use client";

import type { AnalyticsMetrics } from "@/types/pnode";
import { formatNumber, formatPercent } from "@/lib/format";
import { Info } from "lucide-react";

interface SummaryGridProps {
  metrics: AnalyticsMetrics;
}

export function SummaryGrid({ metrics }: SummaryGridProps) {
  const utilization = metrics.committedTb > 0 ? (metrics.usedTb / metrics.committedTb) * 100 : 0;

  const cards = [
    {
      label: "Total pNodes",
      value: formatNumber(metrics.totalNodes),
      helper: `${metrics.publicNodes} public · ${metrics.privateNodes} private`,
      accent: "from-emerald-400/80 to-teal-500/70",
      hint: "Count of storage providers discovered in the latest gossip snapshot, split by exposure.",
    },
    {
      label: "Avg Uptime",
      value: `${formatNumber(metrics.avgUptimeHours, 1)} h`,
      helper: `Peak ${formatNumber(metrics.maxUptimeHours / 24, 1)} d`,
      accent: "from-cyan-400/80 to-blue-500/70",
      hint: "Average lifetime each pNode has stayed online, including the highest observed uptime in days.",
    },
    {
      label: "Storage Utilization",
      value: `${formatNumber(metrics.usedTb, 2)} / ${formatNumber(metrics.committedTb, 2)} TB`,
      helper: `${formatPercent(utilization, 2)} of committed`,
      accent: "from-indigo-400/80 to-purple-500/70",
      hint: "How much capacity pNodes are currently using out of the total they have committed to the network.",
    },
    {
      label: "Latest Release",
      value: metrics.latestVersion,
      helper: `${metrics.outdatedNodes} nodes pending upgrade`,
      accent: "from-amber-400/80 to-orange-500/70",
      hint: "Newest software version detected in gossip and how many nodes are still running older builds.",
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-[26px] border border-white/5 bg-slate-900/45 p-6 shadow-inner shadow-black/25"
        >
          <div className={`mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r ${card.accent}`} />
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-slate-400">
            <span>{card.label}</span>
            <InfoTooltip text={card.hint} />
          </div>
          <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
          <p className="mt-1 text-sm text-slate-400">{card.helper}</p>
        </article>
      ))}
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
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-0 z-20 hidden w-60 -translate-x-1/2 -translate-y-[140%] rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-left text-[11px] leading-relaxed text-slate-100 shadow-2xl group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}
