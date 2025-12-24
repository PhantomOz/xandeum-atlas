import { NextResponse } from "next/server";
import { getSnapshotHistory } from "@/lib/history";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  try {
    const history = await getSnapshotHistory(limit ?? 72);
    return NextResponse.json(history, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("/api/history", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load history" },
      { status: 500 },
    );
  }
}
