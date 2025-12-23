"use client";

import { useState } from "react";
import { ClipboardCheck, ClipboardCopy, Globe, Shield } from "lucide-react";
import type { PNode } from "@/types/pnode";
import { formatBytes, formatDuration, formatPercent, formatRelativeTimeFromSeconds } from "@/lib/format";

interface PNodeDrawerProps {
  node: PNode | null;
  onClose: () => void;
}

export function PNodeDrawer({ node, onClose }: PNodeDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!node) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(node, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Unable to copy node payload", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto border-l border-white/10 bg-slate-950/95 p-6 text-white shadow-[0_0_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Node detail</p>
            <h2 className="mt-2 font-mono text-lg">{node.pubkey}</h2>
            <p className="text-sm text-slate-400">{node.address ?? "private"}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-200 hover:border-white/40"
          >
            Close
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <Stat label="Health" value={`${node.healthScore}`} accent={statusAccent(node.status)} />
          <Stat label="Status" value={node.status} accent="text-slate-200" />
          <Stat label="Exposure" value={node.isPublic ? "Public" : "Private"} />
          <Stat label="Version" value={node.version} />
          <Stat label="Release channel" value={node.channel} />
          <Stat label="Uptime" value={formatDuration(node.uptimeSeconds)} />
          <Stat label="Last seen" value={formatRelativeTimeFromSeconds(node.lastSeenSeconds)} />
          <Stat label="Storage" value={`${formatBytes(node.storageUsed, 2)} / ${formatBytes(node.storageCommitted, 2)}`} />
          <Stat label="Utilization" value={formatPercent(node.storageUsagePercent, 4)} />
          <Stat label="RPC" value={node.rpcPort ? `${node.ip ?? "n/a"}:${node.rpcPort}` : "n/a"} />
        </dl>

        <section className="mt-6 space-y-4 rounded-2xl border border-white/5 bg-slate-900/40 p-4 text-sm text-slate-200">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
            <Shield className="h-3.5 w-3.5" /> Telemetry
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Telemetry label="Gossip" value={node.address ?? "private"} />
            <Telemetry label="RPC" value={node.rpcPort ? `${node.ip ?? "n/a"}:${node.rpcPort}` : "n/a"} />
            <Telemetry label="Staleness" value={node.isStale ? "stale" : "fresh"} />
            <Telemetry label="Last seen" value={new Date(node.lastSeenSeconds * 1000).toLocaleString()} />
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Globe className="h-4 w-4" /> Raw payload
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] text-white hover:border-white/40"
            >
              {copied ? (
                <>
                  <ClipboardCheck className="h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-3.5 w-3.5" /> Copy JSON
                </>
              )}
            </button>
          </div>
          <pre className="max-h-72 overflow-auto rounded-2xl border border-white/5 bg-black/40 p-4 text-[12px] leading-5 text-emerald-200">
            {JSON.stringify(node, null, 2)}
          </pre>
        </section>
      </aside>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className={`mt-1 text-base ${accent ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function Telemetry({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-200 break-all">{value}</p>
    </div>
  );
}

function statusAccent(status: PNode["status"]) {
  if (status === "critical") return "text-rose-300";
  if (status === "warning") return "text-amber-200";
  return "text-emerald-300";
}