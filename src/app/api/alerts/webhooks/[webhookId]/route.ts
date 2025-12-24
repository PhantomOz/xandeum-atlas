import { NextResponse } from "next/server";
import { alertWebhookSchema, type AlertWebhookConfig } from "@/lib/alert-schema";
import { getUserAlertConfigs, saveUserAlertConfigs } from "@/lib/alert-config-store";
import { resolveUserId } from "@/lib/request-user";

interface WebhookResponse {
  webhooks: AlertWebhookConfig[];
}

interface RouteParams {
  webhookId: string;
}

export async function PUT(request: Request, context: { params: Promise<RouteParams> }) {
  const userId = resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Missing x-alert-user header" }, { status: 401 });
  }

  const { webhookId: rawWebhookId } = await context.params;
  const idResult = alertWebhookSchema.shape.id.safeParse(rawWebhookId);
  if (!idResult.success) {
    return NextResponse.json({ error: "Invalid webhook id" }, { status: 400 });
  }
  const webhookId = idResult.data;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = alertWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid webhook config", issues: parsed.error.flatten() }, { status: 422 });
  }
  if (parsed.data.id !== webhookId) {
    return NextResponse.json({ error: "Webhook id mismatch" }, { status: 400 });
  }

  try {
    const existing = await getUserAlertConfigs(userId);
    const index = existing.findIndex((hook) => hook.id === webhookId);
    if (index === -1) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }
    const next = [...existing];
    next[index] = parsed.data;
    const webhooks = await saveUserAlertConfigs(userId, next);
    return NextResponse.json<WebhookResponse>({ webhooks }, { status: 200 });
  } catch (error) {
    console.error(`/api/alerts/webhooks/${webhookId} [PUT]`, error);
    return NextResponse.json({ error: "Unable to update webhook" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<RouteParams> }) {
  const userId = resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Missing x-alert-user header" }, { status: 401 });
  }

  const { webhookId: rawWebhookId } = await context.params;
  const idResult = alertWebhookSchema.shape.id.safeParse(rawWebhookId);
  if (!idResult.success) {
    return NextResponse.json({ error: "Invalid webhook id" }, { status: 400 });
  }
  const webhookId = idResult.data;

  try {
    const existing = await getUserAlertConfigs(userId);
    const next = existing.filter((hook) => hook.id !== webhookId);
    if (next.length === existing.length) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }
    const webhooks = await saveUserAlertConfigs(userId, next);
    return NextResponse.json<WebhookResponse>({ webhooks }, { status: 200 });
  } catch (error) {
    console.error(`/api/alerts/webhooks/${webhookId} [DELETE]`, error);
    return NextResponse.json({ error: "Unable to delete webhook" }, { status: 500 });
  }
}
