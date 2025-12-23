"use client";

import { useCallback, useEffect, useState } from "react";
import type { PNodeSnapshot } from "@/types/pnode";

interface UsePnodeDataOptions {
  refreshInterval?: number;
}

export function usePnodeData(initialSnapshot: PNodeSnapshot | null, options: UsePnodeDataOptions = {}) {
  const [snapshot, setSnapshot] = useState<PNodeSnapshot | null>(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [seedPreference, setSeedPreference] = useState("");

  const refresh = useCallback(async (seedOverride?: string) => {
    const normalizedSeed = seedOverride !== undefined ? seedOverride.trim() : seedPreference;
    if (seedOverride !== undefined) {
      setSeedPreference(normalizedSeed);
    }
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams({ ts: Date.now().toString() });
      if (normalizedSeed) {
        params.set("seed", normalizedSeed);
      }
      const response = await fetch(`/api/pnodes?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`pRPC fetch failed (${response.status})`);
      }
      const data = (await response.json()) as PNodeSnapshot;
      setSnapshot(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to refresh pNodes";
      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [seedPreference]);

  useEffect(() => {
    if (!snapshot) {
      refresh();
      return;
    }

    const interval = setInterval(refresh, options.refreshInterval ?? 30000);
    return () => clearInterval(interval);
  }, [options.refreshInterval, refresh, snapshot]);

  return {
    snapshot,
    refresh,
    isRefreshing,
    error,
    seedPreference,
  };
}
