import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const safeSymbols = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "LINKUSDT"]);
const safeIntervals = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url); const symbol = searchParams.get("symbol") ?? "BTCUSDT"; const interval = searchParams.get("interval") ?? "5m";
  if (!safeSymbols.has(symbol) || !safeIntervals.has(interval)) return NextResponse.json({ error: "Unsupported market or interval." }, { status: 400 });
  try {
    const response = await fetch(`https://api.toobit.com/quote/v1/klines?symbol=${symbol}&interval=${interval}&limit=80`, { cache: "no-store" });
    if (!response.ok) throw new Error("Toobit chart feed unavailable.");
    const rows = await response.json() as Array<Array<string | number>>;
    const candles = rows.map((row) => ({ time: Number(row[0]), open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]) }));
    return NextResponse.json({ candles });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load chart." }, { status: 502 }); }
}
