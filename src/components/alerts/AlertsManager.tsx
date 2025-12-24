"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { AlertTriangle, BellRing, Link2, Loader2, Plus, RefreshCcw, Save, ShieldCheck, Trash2 } from "lucide-react";
import type { AlertWebhookConfig, AlertTrigger } from "@/lib/alert-schema";

const TOKEN_STORAGE_KEY = "alerts:user-token";
const MAX_TRIGGERS = 6;

type TriggerDraft = {
  type: AlertTrigger["type"];
  percent: number;
  cooldownMinutes: string;
};

type WebhookDraft = {
  id: string;
  label: string;
  url: string;
  secret: string;
  isEnabled: boolean;
  triggers: TriggerDraft[];
};

const DEFAULT_TRIGGER_TEMPLATE: TriggerDraft = {
  type: "healthyPercentBelow",
  percent: 70,
  cooldownMinutes: "30",
};

const fetcher = async ([url, token]: [string, string]) => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-alert-user": token,
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : "Unable to load webhooks";
    throw new Error(message);
  }
  return (data?.webhooks as AlertWebhookConfig[]) ?? [];
};

export function AlertsManager() {
  const [token, setToken] = useState("");
  const [tokenReady, setTokenReady] = useState(false);
  const [draft, setDraft] = useState<WebhookDraft>(() => createEmptyDraft());
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ variant: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      setToken(stored);
    }
    setTokenReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !tokenReady) return;
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token, tokenReady]);

  const normalizedToken = token.trim();
  const canFetch = tokenReady && Boolean(normalizedToken);

  const { data: webhooks = [], error, isLoading, mutate } = useSWR<AlertWebhookConfig[]>(
    canFetch ? ["/api/alerts/webhooks", normalizedToken] : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const triggerSummary = useMemo(() => {
    if (!webhooks.length) return "";
    return `${webhooks.length} webhook${webhooks.length === 1 ? "" : "s"}`;
  }, [webhooks]);

  const handleTokenChange = (value: string) => {
    if (value.length > 64) return;
    setToken(value.replace(/\s+/g, ""));
  };

  const handleGenerateToken = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      setToken(crypto.randomUUID().replace(/-/g, "").slice(0, 20));
    } else {
      setToken(Math.random().toString(36).slice(2, 12));
    }
  };

  const handleEdit = (config: AlertWebhookConfig) => {
    setMode("edit");
    setEditingId(config.id);
    setDraft(createDraftFromConfig(config));
    setFeedback(null);
  };

  const resetForm = () => {
    setMode("create");
    setEditingId(null);
    setDraft(createEmptyDraft());
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedToken) {
      setFeedback({ variant: "error", message: "Add an access token before saving webhooks." });
      return;
    }

    const payload = draftToPayload(draft);
    const endpoint = mode === "create" ? "/api/alerts/webhooks" : `/api/alerts/webhooks/${payload.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await requestWithToken(normalizedToken, endpoint, { method, body: JSON.stringify(payload) });
      await mutate();
      setFeedback({ variant: "success", message: mode === "create" ? "Webhook saved" : "Webhook updated" });
      if (mode === "create") {
        setDraft(createEmptyDraft());
      }
      if (mode === "edit") {
        resetForm();
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to save webhook";
      setFeedback({ variant: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (webhookId: string) => {
    if (!normalizedToken) {
      setFeedback({ variant: "error", message: "Add an access token before deleting webhooks." });
      return;
    }
    setDeletingId(webhookId);
    setFeedback(null);
    try {
      await requestWithToken(normalizedToken, `/api/alerts/webhooks/${webhookId}`, { method: "DELETE" });
      await mutate();
      setFeedback({ variant: "success", message: "Webhook removed" });
      if (mode === "edit" && editingId === webhookId) {
        resetForm();
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to delete webhook";
      setFeedback({ variant: "error", message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-10">
      <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-emerald-900/40 via-slate-950/50 to-slate-950/80 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <p className="text-xs uppercase tracking-[0.5em] text-emerald-300">Alert Studio</p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold text-white">Self-serve webhooks for hosted operators</h1>
            <p className="mt-3 text-base text-slate-300">
              Give every tenant their own alert stream without shell access. Define an access token, craft triggers, and the atlas will post to
              their endpoints the moment gossip metrics drift.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 px-6 py-5 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Webhook count</p>
            <p className="mt-2 text-3xl font-semibold text-white">{triggerSummary || "—"}</p>
            <p className="mt-1 text-xs text-slate-400">Evaluated every time a snapshot lands.</p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/5 bg-slate-950/60 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Access token</p>
            <p className="mt-1 text-sm text-slate-300">Share this secret with downstream teams so they can manage their own webhooks.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={token}
              onChange={(event) => handleTokenChange(event.target.value)}
              placeholder="tenant-alpha"
              pattern="^[a-zA-Z0-9._:-]{3,64}$"
              className="min-w-[220px] rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleGenerateToken}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-emerald-400"
            >
              <RefreshCcw className="h-4 w-4" />
              Random token
            </button>
          </div>
        </div>
        {!token && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            Set a token to unlock the webhook workspace.
          </div>
        )}
      </section>

      {canFetch ? (
        <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
          <section className="rounded-[28px] border border-white/5 bg-slate-950/65 p-6">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Tenant webhooks</p>
                <p className="text-sm text-slate-400">One slot per downstream operator. Cooldowns apply per trigger.</p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-emerald-400"
              >
                <Plus className="h-4 w-4" />
                New webhook
              </button>
            </header>

            {feedback ? (
              <div
                className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                  feedback.variant === "success"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-100"
                }`}
              >
                {feedback.variant === "success" ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {feedback.message}
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              {error ? (
                <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  <AlertTriangle className="h-4 w-4" />
                  {error.message}
                </div>
              ) : null}

              {isLoading ? (
                <div className="grid min-h-[200px] place-items-center rounded-3xl border border-white/5 bg-slate-900/40">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
                </div>
              ) : webhooks.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/30 p-8 text-center text-slate-400">
                  <p className="text-sm">No webhooks yet. Start by crafting one on the right.</p>
                </div>
              ) : (
                webhooks.map((config) => (
                  <article key={config.id} className="rounded-3xl border border-white/5 bg-slate-900/40 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-base font-semibold text-white">{config.label ?? config.id}</p>
                        <p className="text-sm text-slate-400">{config.url}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          config.isEnabled === false ? "bg-slate-800 text-slate-300" : "bg-emerald-500/10 text-emerald-200"
                        }`}
                      >
                        <BellRing className="h-3.5 w-3.5" />
                        {config.isEnabled === false ? "Paused" : "Active"}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      {config.triggers.map((trigger, index) => (
                        <span key={`${config.id}-${index}`} className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wide">
                          {renderTriggerBadge(trigger)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() => handleEdit(config)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-white transition hover:border-emerald-400"
                      >
                        <Link2 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(config.id)}
                        disabled={deletingId === config.id}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 px-4 py-2 text-rose-100 transition hover:border-rose-400 disabled:opacity-60"
                      >
                        {deletingId === config.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/5 bg-slate-950/75 p-6">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">{mode === "create" ? "New webhook" : `Editing ${editingId}`}</p>
                <p className="text-sm text-slate-400">Triggers fan out in parallel; cooldowns throttle per trigger.</p>
              </div>
            </header>
            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div>
                <label className="text-xs uppercase tracking-[0.4em] text-slate-400">Webhook ID</label>
                <input
                  required
                  value={draft.id}
                  onChange={(event) => setDraft({ ...draft, id: event.target.value.toLowerCase().replace(/[^a-z0-9._:-]/g, "") })}
                  minLength={2}
                  maxLength={64}
                  pattern="^[a-z0-9._:-]+$"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
                  placeholder="ops-oncall"
                  disabled={mode === "edit"}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.4em] text-slate-400">Label</label>
                  <input
                    value={draft.label}
                    onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                    maxLength={80}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
                    placeholder="PagerDuty"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.4em] text-slate-400">Status</label>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3">
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={draft.isEnabled}
                        onChange={(event) => setDraft({ ...draft, isEnabled: event.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.4em] text-slate-400">Target URL</label>
                <input
                  required
                  type="url"
                  value={draft.url}
                  onChange={(event) => setDraft({ ...draft, url: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
                  placeholder="https://hooks.example.com/xandeum"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.4em] text-slate-400">Secret header</label>
                <input
                  value={draft.secret}
                  onChange={(event) => setDraft({ ...draft, secret: event.target.value })}
                  maxLength={256}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
                  placeholder="optional token"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-[0.4em] text-slate-400">Triggers</label>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, triggers: [...draft.triggers, createTriggerDraft()] })}
                    disabled={draft.triggers.length >= MAX_TRIGGERS}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add trigger
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {draft.triggers.map((trigger, index) => (
                    <div key={`trigger-${index}`} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <select
                          value={trigger.type}
                          onChange={(event) => updateTrigger(index, { type: event.target.value as TriggerDraft["type"] })}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                        >
                          <option value="healthyPercentBelow">Healthy percentage below</option>
                          <option value="criticalPercentAbove">Critical percentage above</option>
                          <option value="totalNodesDrop">Total nodes drop</option>
                          <option value="avgUsagePercentAbove">Average usage above</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeTrigger(index)}
                          disabled={draft.triggers.length === 1}
                          className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-3 py-2 text-sm text-white transition hover:border-rose-400 disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Percent threshold</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={trigger.percent}
                            onChange={(event) => updateTrigger(index, { percent: Number(event.target.value) })}
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Cooldown (minutes)</label>
                          <input
                            type="number"
                            min={5}
                            max={2880}
                            value={trigger.cooldownMinutes}
                            onChange={(event) => updateTrigger(index, { cooldownMinutes: event.target.value })}
                            placeholder="30"
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !draft.triggers.length}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {mode === "create" ? "Create webhook" : "Save changes"}
                </button>
                {mode === "edit" ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm text-white"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">
                Payload includes `tenantId`, `triggerType`, `reason`, `current`, and `previous`. Cooldown defaults to 30 minutes if left blank.
              </p>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );

  function updateTrigger(index: number, patch: Partial<TriggerDraft>) {
    setDraft((current) => {
      const next = [...current.triggers];
      next[index] = { ...next[index], ...patch };
      return { ...current, triggers: next };
    });
  }

  function removeTrigger(index: number) {
    setDraft((current) => {
      if (current.triggers.length === 1) return current;
      const next = current.triggers.filter((_, idx) => idx !== index);
      return { ...current, triggers: next };
    });
  }
}

function renderTriggerBadge(trigger: AlertTrigger): string {
  switch (trigger.type) {
    case "healthyPercentBelow":
      return `Healthy < ${trigger.percent}%`;
    case "criticalPercentAbove":
      return `Critical > ${trigger.percent}%`;
    case "totalNodesDrop":
      return `Nodes drop ${trigger.percent}%`;
    case "avgUsagePercentAbove":
      return `Usage > ${trigger.percent}%`;
    default:
      return "Trigger";
  }
}

function createEmptyDraft(): WebhookDraft {
  return {
    id: "",
    label: "",
    url: "",
    secret: "",
    isEnabled: true,
    triggers: [createTriggerDraft()],
  };
}

function createDraftFromConfig(config: AlertWebhookConfig): WebhookDraft {
  return {
    id: config.id,
    label: config.label ?? "",
    url: config.url,
    secret: config.secret ?? "",
    isEnabled: config.isEnabled !== false,
    triggers: config.triggers.map((trigger) => ({
      type: trigger.type,
      percent: trigger.percent,
      cooldownMinutes: typeof trigger.cooldownMinutes === "number" ? String(trigger.cooldownMinutes) : "",
    })),
  };
}

function draftToPayload(draft: WebhookDraft): AlertWebhookConfig {
  return {
    id: draft.id.trim(),
    label: draft.label.trim() ? draft.label.trim() : undefined,
    url: draft.url.trim(),
    secret: draft.secret.trim() ? draft.secret.trim() : undefined,
    isEnabled: draft.isEnabled,
    triggers: draft.triggers.map((trigger) => ({
      type: trigger.type,
      percent: clampPercent(trigger.percent),
      ...(trigger.cooldownMinutes ? { cooldownMinutes: clampMinutes(Number(trigger.cooldownMinutes)) } : {}),
    })),
  };
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}

function clampMinutes(value: number) {
  if (!Number.isFinite(value)) return undefined;
  const clamped = Math.min(2880, Math.max(1, Math.round(value)));
  return clamped;
}

function createTriggerDraft(): TriggerDraft {
  return {
    type: DEFAULT_TRIGGER_TEMPLATE.type,
    percent: DEFAULT_TRIGGER_TEMPLATE.percent,
    cooldownMinutes: DEFAULT_TRIGGER_TEMPLATE.cooldownMinutes,
  };
}

async function requestWithToken(token: string, url: string, init: RequestInit & { body?: string }) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-alert-user": token,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : "Request failed";
    throw new Error(message);
  }
  return data as { webhooks: AlertWebhookConfig[] };
}
