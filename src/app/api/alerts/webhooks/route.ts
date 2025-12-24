import { NextResponse } from "next/server";
import { alertWebhookSchema, type AlertWebhookConfig } from "@/lib/alert-schema";
import { getUserAlertConfigs, saveUserAlertConfigs } from "@/lib/alert-config-store";
import { resolveUserId } from "@/lib/request-user";

interface WebhookResponse {
  webhooks: AlertWebhookConfig[];
}

export async function GET(request: Request) {
  const userId = resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Missing x-alert-user header" }, { status: 401 });
  }

  try {
    const webhooks = await getUserAlertConfigs(userId);
    return NextResponse.json<WebhookResponse>({ webhooks }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("/api/alerts/webhooks [GET]", error);
    return NextResponse.json({ error: "Unable to load webhook configs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Missing x-alert-user header" }, { status: 401 });
  }

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

  try {
    const existing = await getUserAlertConfigs(userId);
    if (existing.some((hook) => hook.id === parsed.data.id)) {
      return NextResponse.json({ error: "Webhook id already exists" }, { status: 409 });
    }
    const next = [...existing, parsed.data];
    const webhooks = await saveUserAlertConfigs(userId, next);
    return NextResponse.json<WebhookResponse>({ webhooks }, { status: 201 });
  } catch (error) {
    console.error("/api/alerts/webhooks [POST]", error);
    return NextResponse.json({ error: "Unable to save webhook" }, { status: 500 });
  }
}
