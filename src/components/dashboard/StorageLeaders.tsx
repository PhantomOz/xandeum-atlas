"use client";

import { Info, Server, Copy, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { StorageLeader } from "@/types/pnode";
import { formatNumber, formatPercent } from "@/lib/format";

interface StorageLeadersProps {
  leaders: StorageLeader[];
}

export function StorageLeaders({ leaders }: StorageLeadersProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copyValue = async (value: string, id: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Unable to copy value", error);
    }
  };

  return (
    <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-xl shadow-black/20">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Heavy Lifters</p>
          <div className="flex items-center gap-2 text-white">
            <h3 className="text-xl font-semibold">Top Storage Providers</h3>
            <InfoTooltip text="Shows the nodes storing the most data right now. Used vs committed totals help explain their utilization percent." />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Server className="h-4 w-4" />
          Live gossip snapshot
        </div>
      </header>
      <div className="space-y-4">
        {leaders.map((leader) => (
          <article key={leader.pubkey} className="group relative rounded-2xl border border-white/5 bg-slate-950/40 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => copyValue(leader.pubkey, `leader-${leader.pubkey}`)}
                  className="group/btn flex items-center gap-2 text-left text-sm font-semibold text-white"
                  aria-label="Copy public key"
                >
                  <span>{leader.shortKey}</span>
                  {copiedId === `leader-${leader.pubkey}` ? (
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-slate-500 transition group-hover/btn:text-white" />
                  )}
                </button>
                {leader.address ? (
                  <button
                    type="button"
                    onClick={() => copyValue(leader.address ?? "", `leader-address-${leader.pubkey}`)}
                    className="group/address mt-1 inline-flex items-center gap-2 text-left text-xs text-slate-400"
                    aria-label="Copy address"
                  >
                    <span>{leader.address}</span>
                    {copiedId === `leader-address-${leader.pubkey}` ? (
                      <Check className="h-3 w-3 text-emerald-300" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-500 transition group-hover/address:text-white" />
                    )}
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">private</p>
                )}
              </div>
              <div className="flex flex-1 items-center gap-6">
                <div>
                  <p className="text-2xl font-semibold text-white">{formatCapacity(leader.usedTb)}</p>
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
            <RowTooltip leader={leader} />
          </article>
        ))}
      </div>
    </section>
  );
}

function formatCapacity(tb: number): string {
  if (!Number.isFinite(tb) || tb <= 0) {
    return "0 TB";
  }
  if (tb >= 1) {
    return `${formatNumber(tb, 2)} TB`;
  }
  const gb = tb * 1024;
  if (gb >= 1) {
    return `${formatNumber(gb, gb >= 10 ? 1 : 2)} GB`;
  }
  const mb = gb * 1024;
  return `${formatNumber(mb, 0)} MB`;
}

function RowTooltip({ leader }: { leader: StorageLeader }) {
  const used = formatCapacity(leader.usedTb);
  const committed = formatCapacity(leader.committedTb);
  return (
    <div className="pointer-events-none absolute left-4 right-4 top-full z-10 mt-3 hidden rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-xs leading-relaxed text-slate-100 shadow-2xl group-hover:block">
      {leader.shortKey} is consuming {used} out of {committed} committed ({formatPercent(leader.usagePercent, 2)}). {leader.isPublic ? "Publicly reachable." : "Private exposure."}
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
