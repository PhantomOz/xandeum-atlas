"use client";

import { AlertCircle, RefreshCcw, Satellite } from "lucide-react";
import { usePnodeData } from "@/hooks/usePnodeData";
import type { PNodeSnapshot } from "@/types/pnode";
import { SummaryGrid } from "./SummaryGrid";
import { VersionDistribution } from "./VersionDistribution";
import { UsageBands } from "./UsageBands";
import { StatusPanel } from "./StatusPanel";
import { StorageLeaders } from "./StorageLeaders";
import { PNodeTable } from "../table/PNodeTable";
import { SeedControls } from "./SeedControls";

interface DashboardProps {
  initialSnapshot: PNodeSnapshot | null;
}

export function PNodeDashboard({ initialSnapshot }: DashboardProps) {
  const { snapshot, refresh, isRefreshing, error, seedPreference } = usePnodeData(initialSnapshot);

  if (!snapshot) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Bootstrapping</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Discovering Xandeum pNodes…</h1>
          <p className="mt-2 text-slate-400">Waiting for the first gossip snapshot. Ensure at least one seed is reachable.</p>
          <button
            onClick={refresh}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm text-slate-200 hover:border-white/40"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry pRPC
          </button>
        </div>
      </div>
    );
  }

  const lastUpdated = new Date(snapshot.fetchedAt).toLocaleString();

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Xandeum Atlas</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight text-white">pNode Intelligence Canvas</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-300">
            Live visibility into storage provider gossip: version adoption, health posture, and capacity distribution.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <span className="inline-flex items-center gap-2">
              <Satellite className="h-4 w-4 text-emerald-300" /> Responding seed {snapshot.seed}
            </span>
            <span>Discovery list {seedPreference ? seedPreference : "default rotation"}</span>
            <span>Updated {lastUpdated}</span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-end lg:w-auto lg:flex-col">
          <SeedControls
            discoveryList={seedPreference}
            respondingSeed={snapshot.seed}
            onConnect={(value) => refresh(value)}
            onReset={() => refresh("")}
            isRefreshing={isRefreshing}
          />
          <button
            onClick={() => refresh()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-white hover:border-white/40"
            disabled={isRefreshing}
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <SummaryGrid metrics={snapshot.metrics} />

      <div className="grid gap-6 lg:grid-cols-3">
        <VersionDistribution data={snapshot.metrics.versionDistribution} />
        <UsageBands data={snapshot.metrics.usageBuckets} />
        <StatusPanel metrics={snapshot.metrics} />
      </div>

      <StorageLeaders leaders={snapshot.metrics.storageLeaders} />

      <PNodeTable nodes={snapshot.nodes} lastUpdated={snapshot.fetchedAt} />
    </div>
  );
}
