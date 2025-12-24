import { promises as fs } from "node:fs";
import path from "node:path";
import { getAllUserAlertConfigTuples } from "@/lib/alert-config-store";
import { alertWebhookSchema, type AlertTrigger, type AlertWebhookConfig } from "@/lib/alert-schema";
import type { SnapshotHistoryEntry } from "@/types/pnode";

const LEGACY_ALERT_CONFIG_PATH = path.join(process.cwd(), "data", "alert-webhooks.json");
const ALERT_LOG_PATH = path.join(process.cwd(), "data", "alert-log.json");
const DEFAULT_COOLDOWN_MINUTES = 30;

interface AlertLogRecord {
  [key: string]: string;
}

interface TriggerMatch {
  userId: string;
  config: AlertWebhookConfig;
  trigger: AlertTrigger;
  triggerIndex: number;
  reason: string;
}

export async function processAlertWebhooks(previous: SnapshotHistoryEntry | null, current: SnapshotHistoryEntry): Promise<void> {
  try {
    const configs = await loadAllAlertConfigs();
    if (!configs.length) {
      return;
    }
    const log = await loadAlertLog();
    const matches = collectTriggeredEvents(configs, previous, current, log);
    if (!matches.length) {
      return;
    }

    const now = new Date().toISOString();
    const deliveredKeys: string[] = [];
    await Promise.all(
      matches.map(async ({ userId, config, trigger, triggerIndex, reason }) => {
        const delivered = await dispatchWebhook(userId, config, trigger, reason, current, previous, now).catch((error) => {
          console.error("Failed to dispatch alert webhook", userId, config.id, error);
          return false;
        });
        if (delivered) {
          const key = throttleKey(userId, config.id, triggerIndex);
          deliveredKeys.push(key);
        }
      }),
    );

    if (deliveredKeys.length) {
      const nextLog = { ...log };
      for (const key of deliveredKeys) {
        nextLog[key] = now;
      }
      await fs.writeFile(ALERT_LOG_PATH, JSON.stringify(nextLog, null, 2), "utf8");
    }
  } catch (error) {
    console.error("Alert webhook processing failed", error);
  }
}

async function loadAllAlertConfigs(): Promise<Array<{ userId: string; config: AlertWebhookConfig }>> {
  const tuples = await getAllUserAlertConfigTuples();
  const legacy = await loadLegacyAlertConfigs();
  return [...tuples, ...legacy];
}

async function loadLegacyAlertConfigs(): Promise<Array<{ userId: string; config: AlertWebhookConfig }>> {
  try {
    const raw = await fs.readFile(LEGACY_ALERT_CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => normalizeLegacyConfig(entry))
      .filter((entry): entry is AlertWebhookConfig => Boolean(entry))
      .map((config) => ({ userId: "__legacy__", config }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(path.dirname(LEGACY_ALERT_CONFIG_PATH), { recursive: true });
      await fs.writeFile(LEGACY_ALERT_CONFIG_PATH, "[]", "utf8");
      return [];
    }
    console.error("Unable to read legacy alert config", error);
    return [];
  }
}

async function loadAlertLog(): Promise<AlertLogRecord> {
  try {
    const raw = await fs.readFile(ALERT_LOG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed as AlertLogRecord;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(path.dirname(ALERT_LOG_PATH), { recursive: true });
      await fs.writeFile(ALERT_LOG_PATH, "{}", "utf8");
      return {};
    }
    throw error;
  }
}

function collectTriggeredEvents(
  configs: Array<{ userId: string; config: AlertWebhookConfig }>,
  previous: SnapshotHistoryEntry | null,
  current: SnapshotHistoryEntry,
  log: AlertLogRecord,
): TriggerMatch[] {
  const matches: TriggerMatch[] = [];
  configs.forEach(({ userId, config }) => {
    if (config.isEnabled === false || !config.triggers.length) {
      return;
    }
    config.triggers.forEach((trigger, index) => {
      const reason = evaluateTrigger(trigger, previous, current);
      if (!reason) {
        return;
      }
      const key = throttleKey(userId, config.id, index);
      const cooldownMs = minutesToMs(trigger.cooldownMinutes ?? DEFAULT_COOLDOWN_MINUTES);
      const lastTriggered = log[key] ? Date.parse(log[key]) : 0;
      if (lastTriggered && Date.now() - lastTriggered < cooldownMs) {
        return;
      }
      matches.push({ userId, config, trigger, triggerIndex: index, reason });
    });
  });
  return matches;
}

function evaluateTrigger(trigger: AlertTrigger, previous: SnapshotHistoryEntry | null, current: SnapshotHistoryEntry): string | null {
  switch (trigger.type) {
    case "totalNodesDrop": {
      if (!previous || previous.totalNodes === 0) {
        return null;
      }
      const delta = previous.totalNodes - current.totalNodes;
      if (delta <= 0) {
        return null;
      }
      const percentDrop = (delta / previous.totalNodes) * 100;
      if (percentDrop < trigger.percent) {
        return null;
      }
      return `Total nodes dropped ${percentDrop.toFixed(2)}% (${previous.totalNodes} → ${current.totalNodes})`;
    }
    case "healthyPercentBelow": {
      if (!current.totalNodes) {
        return null;
      }
      const healthyPercent = (current.healthy / current.totalNodes) * 100;
      if (healthyPercent >= trigger.percent) {
        return null;
      }
      return `Healthy share ${healthyPercent.toFixed(2)}% is below ${trigger.percent}%`;
    }
    case "criticalPercentAbove": {
      if (!current.totalNodes) {
        return null;
      }
      const criticalPercent = (current.critical / current.totalNodes) * 100;
      if (criticalPercent <= trigger.percent) {
        return null;
      }
      return `Critical share ${criticalPercent.toFixed(2)}% exceeds ${trigger.percent}%`;
    }
    case "avgUsagePercentAbove": {
      if (current.avgUsagePercent <= trigger.percent) {
        return null;
      }
      return `Average usage ${current.avgUsagePercent.toFixed(2)}% exceeds ${trigger.percent}%`;
    }
    default:
      return null;
  }
}

async function dispatchWebhook(
  userId: string,
  config: AlertWebhookConfig,
  trigger: AlertTrigger,
  reason: string,
  current: SnapshotHistoryEntry,
  previous: SnapshotHistoryEntry | null,
  generatedAt: string,
): Promise<boolean> {
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.secret ? { "x-alert-secret": config.secret } : {}),
      },
      body: JSON.stringify({
        webhookId: config.id,
        triggerType: trigger.type,
        reason,
        generatedAt,
        tenantId: userId,
        current,
        previous,
      }),
    });
    if (!response.ok) {
      throw new Error(`Webhook responded with ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error(`Alert webhook ${userId}/${config.id} failed`, error);
    return false;
  }
}

function normalizeLegacyConfig(entry: unknown): AlertWebhookConfig | null {
  const result = alertWebhookSchema.safeParse(entry);
  return result.success ? result.data : null;
}

function throttleKey(userId: string, webhookId: string, triggerIndex: number) {
  return `${userId}:${webhookId}:${triggerIndex}`;
}

function minutesToMs(minutes: number) {
  return minutes * 60 * 1000;
}
