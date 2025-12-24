import { alertWebhookSchema, type AlertWebhookConfig } from "@/lib/alert-schema";
import { readJsonStore, writeJsonStore } from "@/lib/persistent-store";

const ALERT_CONFIG_STORE_KEY = "user-alert-webhooks";

type AlertStoreShape = Record<string, AlertWebhookConfig[]>;

export async function getAllUserAlertConfigTuples(): Promise<Array<{ userId: string; config: AlertWebhookConfig }>> {
  const store = await readStore();
  const tuples: Array<{ userId: string; config: AlertWebhookConfig }> = [];
  Object.entries(store).forEach(([userId, configs]) => {
    configs.forEach((config) => {
      tuples.push({ userId, config });
    });
  });
  return tuples;
}

export async function getUserAlertConfigs(userId: string): Promise<AlertWebhookConfig[]> {
  const store = await readStore();
  return store[userId] ?? [];
}

export async function saveUserAlertConfigs(userId: string, configs: AlertWebhookConfig[]): Promise<AlertWebhookConfig[]> {
  const store = await readStore();
  const sanitized = sanitizeConfigList(configs);
  if (sanitized.length) {
    store[userId] = sanitized;
  } else {
    delete store[userId];
  }
  await writeStore(store);
  return sanitized;
}

async function readStore(): Promise<AlertStoreShape> {
  const parsed = await readJsonStore<Record<string, unknown>>(ALERT_CONFIG_STORE_KEY, {});
  return Object.entries(parsed).reduce<AlertStoreShape>((acc, [userId, configs]) => {
    if (typeof userId !== "string" || !userId.trim()) {
      return acc;
    }
    const normalized = sanitizeConfigList(configs);
    if (normalized.length) {
      acc[userId] = normalized;
    }
    return acc;
  }, {});
}

async function writeStore(store: AlertStoreShape): Promise<void> {
  await writeJsonStore(ALERT_CONFIG_STORE_KEY, store);
}

function sanitizeConfigList(value: unknown): AlertWebhookConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      const result = alertWebhookSchema.safeParse(entry);
      return result.success ? result.data : null;
    })
    .filter((entry): entry is AlertWebhookConfig => Boolean(entry));
}
