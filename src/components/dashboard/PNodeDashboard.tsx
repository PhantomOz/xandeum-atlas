"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCcw, Satellite } from "lucide-react";
import { usePnodeData } from "@/hooks/usePnodeData";
import { useHistoryData } from "@/hooks/useHistoryData";
import type { PNodeSnapshot } from "@/types/pnode";
import { SummaryGrid } from "./SummaryGrid";
import { VersionDistribution } from "./VersionDistribution";
import { UsageBands } from "./UsageBands";
import { StatusPanel } from "./StatusPanel";
import { StorageLeaders } from "./StorageLeaders";
import { HistoricalTrends, type HistoryView } from "./HistoricalTrends";
import { PNodeTable } from "../table/PNodeTable";
import { SeedControls } from "./SeedControls";

const HISTORY_LIMIT_OPTIONS = [24, 48, 72, 144];
const DEFAULT_HISTORY_LIMIT = HISTORY_LIMIT_OPTIONS[2];
const DEFAULT_HISTORY_VIEW: HistoryView = "capacity";
const HISTORY_LIMIT_STORAGE_KEY = "pnodes:historyLimit";
const HISTORY_VIEW_STORAGE_KEY = "pnodes:trendView";
const TREND_LIMIT_QUERY_KEY = "trendLimit";
const TREND_VIEW_QUERY_KEY = "trendView";

interface DashboardProps {
  initialSnapshot: PNodeSnapshot | null;
}

export function PNodeDashboard({ initialSnapshot }: DashboardProps) {
  const { snapshot, refresh, isRefreshing, error, seedPreference } = usePnodeData(initialSnapshot);
  const [historyLimit, setHistoryLimit] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_HISTORY_LIMIT;
    }
    const params = new URLSearchParams(window.location.search);
    const queryLimit = params.get(TREND_LIMIT_QUERY_KEY);
    if (queryLimit) {
      const parsed = Number(queryLimit);
      if (Number.isFinite(parsed) && HISTORY_LIMIT_OPTIONS.includes(parsed)) {
        return parsed;
      }
    }
    try {
      const raw = window.localStorage.getItem(HISTORY_LIMIT_STORAGE_KEY);
      if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && HISTORY_LIMIT_OPTIONS.includes(parsed)) {
          return parsed;
        }
      }
    } catch (storageError) {
      console.warn("Unable to load history limit preference", storageError);
    }
    return DEFAULT_HISTORY_LIMIT;
  });
  const [historyView, setHistoryView] = useState<HistoryView>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_HISTORY_VIEW;
    }
    const params = new URLSearchParams(window.location.search);
    const queryView = params.get(TREND_VIEW_QUERY_KEY);
    if (isHistoryView(queryView)) {
      return queryView;
    }
    try {
      const stored = window.localStorage.getItem(HISTORY_VIEW_STORAGE_KEY);
      if (isHistoryView(stored)) {
        return stored;
      }
    } catch (storageError) {
      console.warn("Unable to load history view preference", storageError);
    }
    return DEFAULT_HISTORY_VIEW;
  });
  const { history, isLoading: historyLoading, error: historyError, refresh: refreshHistory } = useHistoryData({ limit: historyLimit, refreshInterval: 120000 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(HISTORY_LIMIT_STORAGE_KEY, String(historyLimit));
    } catch (storageError) {
      console.warn("Unable to persist history limit preference", storageError);
    }
  }, [historyLimit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(HISTORY_VIEW_STORAGE_KEY, historyView);
    } catch (storageError) {
      console.warn("Unable to persist history view preference", storageError);
    }
  }, [historyView]);

  const handleHistoryLimitChange = (next: number) => {
    if (!HISTORY_LIMIT_OPTIONS.includes(next)) return;
    setHistoryLimit((current) => (current === next ? current : next));
  };

  const handleHistoryViewChange = (next: HistoryView) => {
    setHistoryView((current) => (current === next ? current : next));
  };

  const explorerShareQuery = useMemo(() => ({
    [TREND_LIMIT_QUERY_KEY]: String(historyLimit),
    [TREND_VIEW_QUERY_KEY]: historyView,
  }), [historyLimit, historyView]);

  if (!snapshot) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Bootstrapping</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Discovering Xandeum pNodes…</h1>
          <p className="mt-2 text-slate-400">Waiting for the first gossip snapshot. Ensure at least one seed is reachable.</p>
          <button
            onClick={() => refresh()}
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
    <div className="space-y-10">
      <header className="grid gap-8 lg:grid-cols-[3fr_minmax(0,1.4fr)] xl:gap-12">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-emerald-300">Xandeum Atlas</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-white lg:text-[44px]">pNode Intelligence Canvas</h1>
          <p className="mt-4 max-w-3xl text-base text-slate-300">
            Live visibility into storage provider gossip: version adoption, health posture, and capacity distribution.
          </p>
          <div className="mt-6 grid gap-4 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-slate-500">
                <Satellite className="h-3.5 w-3.5 text-emerald-300" /> Seed
              </span>
              <p className="mt-1 font-mono text-sm text-white">{snapshot.seed}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Discovery list</p>
              <p className="mt-1 text-sm text-white">{seedPreference ? seedPreference : "Default rotation"}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Last synced</p>
              <p className="mt-1 text-sm text-white">{lastUpdated}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:items-stretch">
          <SeedControls
            discoveryList={seedPreference}
            respondingSeed={snapshot.seed}
            onConnect={(value) => refresh(value)}
            onReset={() => refresh("")}
            isRefreshing={isRefreshing}
          />
          <button
            onClick={() => refresh()}
            className="h-12 rounded-2xl border border-white/10 bg-slate-900/40 text-sm font-semibold text-white transition hover:border-white/40 disabled:opacity-60"
            disabled={isRefreshing}
          >
            <span className="inline-flex w-full items-center justify-center gap-2">
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing" : "Refresh snapshot"}
            </span>
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

      <HistoricalTrends
        data={history}
        isLoading={historyLoading}
        error={historyError}
        onRefresh={refreshHistory}
        limitOptions={HISTORY_LIMIT_OPTIONS}
        activeLimit={historyLimit}
        onLimitChange={handleHistoryLimitChange}
        view={historyView}
        onViewChange={handleHistoryViewChange}
      />

      <StorageLeaders leaders={snapshot.metrics.storageLeaders} />

      <PNodeTable nodes={snapshot.nodes} lastUpdated={snapshot.fetchedAt} shareQuery={explorerShareQuery} />
    </div>
  );
}

function isHistoryView(value: string | null): value is HistoryView {
  return value === "capacity" || value === "utilization" || value === "health";
}
