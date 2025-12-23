"use client";

import { Server } from "lucide-react";
import type { StorageLeader } from "@/types/pnode";
import { formatNumber, formatPercent } from "@/lib/format";

interface StorageLeadersProps {
  leaders: StorageLeader[];
}

export function StorageLeaders({ leaders }: StorageLeadersProps) {
  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-xl shadow-black/20">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Heavy Lifters</p>
          <h3 className="text-xl font-semibold text-white">Top Storage Providers</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Server className="h-4 w-4" />
          Live gossip snapshot
        </div>
      </header>
      <div className="space-y-4">
        {leaders.map((leader) => (
          <article key={leader.pubkey} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{leader.shortKey}</p>
                <p className="text-xs text-slate-400">{leader.address ?? "private"}</p>
              </div>
              <div className="flex flex-1 items-center gap-6">
                <div>
                  <p className="text-2xl font-semibold text-white">{formatNumber(leader.usedTb, 2)} TB</p>
                  <p className="text-xs text-slate-400">Used · {formatPercent(leader.usagePercent, 2)}</p>
                </div>
                <div className="hidden flex-1 lg:block">
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${leader.status === "critical" ? "bg-rose-500" : leader.status === "warning" ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${Math.min(leader.usagePercent, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-300">{leader.version}</p>
                  <p className="text-xs text-slate-500">{leader.isPublic ? "public" : "private"}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
