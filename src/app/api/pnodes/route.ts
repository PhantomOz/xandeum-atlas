import { NextResponse } from "next/server";
import { getPnodeSnapshot } from "@/lib/pnodes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "1";
  const rawSeeds = searchParams.get("seed") ?? searchParams.get("seeds");
  const customSeeds = rawSeeds
    ?.split(",")
    .map((seed) => seed.trim())
    .filter(Boolean);

  try {
    const snapshot = await getPnodeSnapshot({ forceRefresh, customSeeds });
    return NextResponse.json(snapshot, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("/api/pnodes", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown pRPC failure" },
      { status: 500 },
    );
  }
}
