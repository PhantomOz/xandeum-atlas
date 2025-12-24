import { NextResponse } from "next/server";
import { getPnodeSnapshot } from "@/lib/pnodes";
import { buildExportHeaders, ensureExportAccess, formatSummaryPayload } from "@/lib/export-utils";

export async function GET(request: Request) {
  const access = ensureExportAccess(request);
  if (!access.ok) {
    return access.response;
  }

  try {
    const snapshot = await getPnodeSnapshot().catch((error) => {
      console.error("/api/export/summary snapshot failure", error);
      return null;
    });
    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot unavailable" }, { status: 503 });
    }

    const payload = formatSummaryPayload(snapshot);
    return NextResponse.json(payload, {
      status: 200,
      headers: buildExportHeaders(),
    });
  } catch (error) {
    console.error("/api/export/summary", error);
    return NextResponse.json({ error: "Unable to prepare summary" }, { status: 500 });
  }
}
