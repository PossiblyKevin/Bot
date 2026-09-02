import { NextResponse } from "next/server";
import { settings } from "@/lib/config";
import { ToobitAdapter } from "@/lib/toobit";

export const runtime = "nodejs";

export async function POST() {
  if (!settings.apiKey || !settings.secretKey) return NextResponse.json({ ok: false, message: "Add a new Toobit API key and secret to .env.local first." }, { status: 400 });
  try {
    const account = await new ToobitAdapter().checkConnection();
    return NextResponse.json({ ok: true, message: `Toobit authenticated successfully (${account.accountType} account).` });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Connection test failed." }, { status: 502 });
  }
}
