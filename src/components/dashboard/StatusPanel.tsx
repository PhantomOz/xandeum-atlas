"use client";

import { AlertTriangle, Flame, ShieldCheck } from "lucide-react";
import type { AnalyticsMetrics } from "@/types/pnode";

interface StatusPanelProps {
  metrics: AnalyticsMetrics;
}

const statusBlocks = [
  {
    key: "healthy",
    label: "Healthy",
    icon: ShieldCheck,
    accent: "bg-emerald-500/10 text-emerald-300",
  },
  {
    key: "warning",
    label: "Warning",
    icon: AlertTriangle,
    accent: "bg-amber-500/10 text-amber-300",
  },
  {
    key: "critical",
    label: "Critical",
    icon: Flame,
    accent: "bg-rose-500/10 text-rose-300",
  },
] as const;

export function StatusPanel({ metrics }: StatusPanelProps) {
  const total = Math.max(metrics.totalNodes, 1);

  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-lg shadow-black/20">
      <header className="mb-4">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Network Pulse</p>
        <h3 className="text-xl font-semibold text-white">Health Breakdown</h3>
      </header>
      <div className="space-y-4">
        {statusBlocks.map((block) => {
          const value = metrics[block.key];
          const percentage = (value / total) * 100;
          const Icon = block.icon;
          return (
            <article key={block.key} className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{block.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                </div>
                <div className={`grid h-12 w-12 place-items-center rounded-full ${block.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-white/80 to-white/40" style={{ width: `${percentage}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{percentage.toFixed(1)}% of network</p>
            </article>
          );
        })}
        <p className="text-sm text-slate-400">{metrics.stale} nodes are considered stale (no gossip for ≥30 min).</p>
      </div>
    </section>
  );
}
