import { NextResponse } from "next/server";
import { paperOrder } from "@/lib/paper-engine";
import type { Side } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { side, notional } = await request.json() as { side: Side; notional: number };
    if ((side !== "BUY" && side !== "SELL") || !Number.isFinite(notional) || notional <= 0) return NextResponse.json({ error: "A valid side and positive notional are required." }, { status: 400 });
    return NextResponse.json({ trade: paperOrder(side, notional) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to place paper order." }, { status: 400 });
  }
}
