import { promises as fs } from "node:fs";
import path from "node:path";
import { alertWebhookSchema, type AlertWebhookConfig } from "@/lib/alert-schema";

const USER_ALERT_CONFIG_PATH = path.join(process.cwd(), "data", "user-alert-webhooks.json");

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

async function ensureStoreFile(): Promise<void> {
  await fs.mkdir(path.dirname(USER_ALERT_CONFIG_PATH), { recursive: true });
  try {
    await fs.access(USER_ALERT_CONFIG_PATH);
  } catch {
    await fs.writeFile(USER_ALERT_CONFIG_PATH, "{}", "utf8");
  }
}

async function readStore(): Promise<AlertStoreShape> {
  await ensureStoreFile();
  try {
    const raw = await fs.readFile(USER_ALERT_CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return Object.entries(parsed as Record<string, unknown>).reduce<AlertStoreShape>((acc, [userId, configs]) => {
      if (typeof userId !== "string" || !userId.trim()) {
        return acc;
      }
      const normalized = sanitizeConfigList(configs);
      if (normalized.length) {
        acc[userId] = normalized;
      }
      return acc;
    }, {});
  } catch (error) {
    console.error("Unable to read user alert config store", error);
    return {};
  }
}

async function writeStore(store: AlertStoreShape): Promise<void> {
  await fs.writeFile(USER_ALERT_CONFIG_PATH, JSON.stringify(store, null, 2), "utf8");
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
