"use client";

import { useEffect, useState } from "react";
import { Compass, RefreshCcw, Undo2 } from "lucide-react";

interface SeedControlsProps {
  discoveryList: string;
  respondingSeed: string;
  onConnect: (seeds: string) => void;
  onReset: () => void;
  isRefreshing: boolean;
}

export function SeedControls({ discoveryList, respondingSeed, onConnect, onReset, isRefreshing }: SeedControlsProps) {
  const [value, setValue] = useState(discoveryList);

  useEffect(() => {
    setValue(discoveryList);
  }, [discoveryList]);

  const handleConnect = () => {
    onConnect(value.trim());
  };

  const handleReset = () => {
    setValue("");
    onReset();
  };

  return (
    <div className="w-full rounded-3xl border border-white/5 bg-slate-950/55 p-5 shadow-inner shadow-black/40">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Discovery list</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/5 bg-slate-900/45 px-3 py-2">
          <Compass className="h-4 w-4 text-emerald-300" />
          <input
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            placeholder="173.212.220.65, 161.97.97.41"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={handleConnect}
          disabled={isRefreshing}
          className="inline-flex min-w-[92px] items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-white/40 disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Use
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="font-mono text-[11px] text-slate-200">Seed {respondingSeed}</span>
        <span className="hidden text-slate-600 lg:inline">·</span>
        <button type="button" onClick={handleReset} className="inline-flex items-center gap-1 text-slate-300">
          <Undo2 className="h-3.5 w-3.5" />
          Reset to default rotation
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">
        Provide comma-separated IPs or hostnames. The atlas will attempt them in order before falling back to the default gossip scouts.
      </p>
    </div>
  );
}
