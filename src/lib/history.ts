import { promises as fs } from "node:fs";
import path from "node:path";
import type { PNodeSnapshot, SnapshotHistoryEntry } from "@/types/pnode";
import { processAlertWebhooks } from "@/lib/alerts";

const HISTORY_FILE = path.join(process.cwd(), "data", "pnode-history.json");
const MAX_ENTRIES = Number(process.env.PNODE_HISTORY_LIMIT ?? 288);

async function ensureHistoryFile(): Promise<void> {
  await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
  try {
    await fs.access(HISTORY_FILE);
  } catch {
    await fs.writeFile(HISTORY_FILE, "[]", "utf8");
  }
}

async function readHistoryFile(): Promise<SnapshotHistoryEntry[]> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf8");
    return JSON.parse(raw) as SnapshotHistoryEntry[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function recordSnapshotMetrics(snapshot: PNodeSnapshot): Promise<void> {
  try {
    await ensureHistoryFile();
    const history = await readHistoryFile();
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
    await fs.writeFile(HISTORY_FILE, JSON.stringify(trimmed, null, 2), "utf8");
    await processAlertWebhooks(previous, entry);
  } catch (error) {
    console.error("Failed to persist pNode snapshot history", error);
  }
}

export async function getSnapshotHistory(limit = 72): Promise<SnapshotHistoryEntry[]> {
  const history = await readHistoryFile();
  if (history.length <= limit) {
    return history;
  }
  return history.slice(-limit);
}
