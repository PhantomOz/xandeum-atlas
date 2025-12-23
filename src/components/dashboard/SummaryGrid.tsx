"use client";

import type { AnalyticsMetrics } from "@/types/pnode";
import { formatNumber, formatPercent } from "@/lib/format";

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
    },
    {
      label: "Avg Uptime",
      value: `${formatNumber(metrics.avgUptimeHours, 1)} h`,
      helper: `Peak ${formatNumber(metrics.maxUptimeHours / 24, 1)} d`,
      accent: "from-cyan-400/80 to-blue-500/70",
    },
    {
      label: "Storage Utilization",
      value: `${formatNumber(metrics.usedTb, 2)} / ${formatNumber(metrics.committedTb, 2)} TB`,
      helper: `${formatPercent(utilization, 2)} of committed`,
      accent: "from-indigo-400/80 to-purple-500/70",
    },
    {
      label: "Latest Release",
      value: metrics.latestVersion,
      helper: `${metrics.outdatedNodes} nodes pending upgrade`,
      accent: "from-amber-400/80 to-orange-500/70",
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
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
          <p className="mt-1 text-sm text-slate-400">{card.helper}</p>
        </article>
      ))}
    </div>
  );
}
