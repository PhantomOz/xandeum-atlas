import type { PNodeSnapshot, SnapshotHistoryEntry } from "@/types/pnode";
import { processAlertWebhooks } from "@/lib/alerts";
import { readJsonStore, writeJsonStore } from "@/lib/persistent-store";

const HISTORY_STORE_KEY = "pnode-history";
const MAX_ENTRIES = Number(process.env.PNODE_HISTORY_LIMIT ?? 288);

async function readHistoryStore(): Promise<SnapshotHistoryEntry[]> {
  return readJsonStore<SnapshotHistoryEntry[]>(HISTORY_STORE_KEY, []);
}

export async function recordSnapshotMetrics(snapshot: PNodeSnapshot): Promise<void> {
  try {
    const history = await readHistoryStore();
    const entry: SnapshotHistoryEntry = {
      timestamp: snapshot.fetchedAt,
      totalNodes: snapshot.metrics.totalNodes,
      usedTb: snapshot.metrics.usedTb,
      committedTb: snapshot.metrics.committedTb,
      avgUsagePercent: snapshot.metrics.avgUsagePercent,
      healthy: snapshot.metrics.healthy,
      warning: snapshot.metrics.warning,
      critical: snapshot.metrics.critical,
    };
    const previous = history.length ? history[history.length - 1] : null;
    history.push(entry);
    const trimmed = history.slice(-MAX_ENTRIES);
    await writeJsonStore(HISTORY_STORE_KEY, trimmed);
    await processAlertWebhooks(previous, entry);
  } catch (error) {
    console.error("Failed to persist pNode snapshot history", error);
  }
}

export async function getSnapshotHistory(limit = 72): Promise<SnapshotHistoryEntry[]> {
  const history = await readHistoryStore();
  if (history.length <= limit) {
    return history;
  }
  return history.slice(-limit);
}
