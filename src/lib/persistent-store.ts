import { promises as fs } from "node:fs";
import path from "node:path";
import { kv } from "@vercel/kv";

const DATA_ROOT = process.env.DATA_ROOT ?? path.join(process.cwd(), "data");
const KV_NAMESPACE = process.env.KV_NAMESPACE ?? "atlas";
const hasKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export async function readJsonStore<T>(name: string, fallback: T): Promise<T> {
  if (hasKv) {
    const data = await kv.get<T>(kvKey(name));
    if (data === null || data === undefined) {
      return fallback;
    }
    return data;
  }
  const filePath = filePathFor(name);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function writeJsonStore<T>(name: string, value: T): Promise<void> {
  if (hasKv) {
    await kv.set(kvKey(name), value);
    return;
  }
  const filePath = filePathFor(name);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

export function usingKvStore(): boolean {
  return hasKv;
}

function kvKey(name: string) {
  return `${KV_NAMESPACE}:${name}`;
}

function filePathFor(name: string) {
  return path.join(DATA_ROOT, `${name}.json`);
}
