import { NextResponse } from "next/server";
import { settings } from "@/lib/config";
import { ToobitAdapter } from "@/lib/toobit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!settings.apiKey || !settings.secretKey) return NextResponse.json({ connected: false, message: "Add credentials to .env.local to view account assets.", spot: [], futures: [] }, { status: 400 });
  const client = new ToobitAdapter();
  try {
    const [account, futuresResult] = await Promise.allSettled([client.getAccount(), client.getFuturesBalance()]);
    if (account.status !== "fulfilled") throw account.reason;
    const clean = (balances: Array<{ coin: string; free: string; locked: string; total: string }>) => balances.map((asset) => ({ coin: asset.coin, free: Number(asset.free), locked: Number(asset.locked), total: Number(asset.total) })).filter((asset) => asset.total > 0 || asset.locked > 0);
    const spot = clean(account.value.balances);
    const futures = futuresResult.status === "fulfilled" ? clean(futuresResult.value) : [];
    const futuresUnavailable = futuresResult.status === "rejected";
    const message = spot.length ? "Spot balances are ready to trade where their free amount is positive." : futures.length ? "No funds are available in Spot. Funds were detected in Futures and must be transferred to Spot before spot trading." : futuresUnavailable ? "No Spot balance was found. Futures availability could not be checked with this API key, so other account funds cannot be confirmed." : "No usable spot balance was found.";
    return NextResponse.json({ connected: true, spot, futures, futuresUnavailable, message });
  } catch (error) {
    return NextResponse.json({ connected: false, spot: [], futures: [], message: error instanceof Error ? error.message : "Unable to load account balances." }, { status: 502 });
  }
}
