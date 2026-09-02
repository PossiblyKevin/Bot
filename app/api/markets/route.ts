import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const watchlist = [
  { symbol: "BTCUSDT", name: "Bitcoin", code: "BTC" },
  { symbol: "ETHUSDT", name: "Ethereum", code: "ETH" },
  { symbol: "SOLUSDT", name: "Solana", code: "SOL" },
  { symbol: "XRPUSDT", name: "XRP", code: "XRP" },
  { symbol: "DOGEUSDT", name: "Dogecoin", code: "DOGE" },
  { symbol: "LINKUSDT", name: "Chainlink", code: "LINK" }
];

type Ticker = { s: string; c: string; pcp: string; qv: string };

export async function GET() {
  try {
    const response = await fetch("https://api.toobit.com/quote/v1/ticker/24hr", { cache: "no-store" });
    if (!response.ok) throw new Error("Market feed unavailable");
    const rows = await response.json() as Ticker[];
    const tokens = watchlist.map((token) => {
      const ticker = rows.find((item) => item.s === token.symbol);
      return { ...token, price: Number(ticker?.c ?? 0), change: Number(ticker?.pcp ?? 0), quoteVolume: Number(ticker?.qv ?? 0) };
    });
    const spotlight = [...tokens].sort((a, b) => b.quoteVolume - a.quoteVolume)[0];
    return NextResponse.json({ tokens, spotlight: spotlight?.symbol ?? null, updatedAt: Date.now() });
  } catch {
    return NextResponse.json({ tokens: watchlist.map((token) => ({ ...token, price: 0, change: 0, quoteVolume: 0 })), spotlight: null, updatedAt: Date.now(), unavailable: true });
  }
}
