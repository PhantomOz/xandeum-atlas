"use client";

import { useCallback, useEffect, useState } from "react";
import type { SnapshotHistoryEntry } from "@/types/pnode";

interface UseHistoryOptions {
  limit?: number;
  refreshInterval?: number;
}

export function useHistoryData(options: UseHistoryOptions = {}) {
  const { limit = 72, refreshInterval = 60000 } = options;
  const [history, setHistory] = useState<SnapshotHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: String(limit), ts: Date.now().toString() });
      const response = await fetch(`/api/history?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`History request failed (${response.status})`);
      }
      const data = (await response.json()) as SnapshotHistoryEntry[];
      setHistory(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load history";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, refreshInterval);
    return () => clearInterval(interval);
  }, [loadHistory, refreshInterval]);

  return {
    history,
    error,
    isLoading,
    refresh: loadHistory,
  };
}
