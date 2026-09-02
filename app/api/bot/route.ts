import { NextResponse } from "next/server";
import { botStatus, startBot, stopBot } from "@/lib/bot";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(await botStatus()); }
export async function POST(request: Request) { try { const { action } = await request.json() as { action: "start" | "stop" }; return NextResponse.json(action === "start" ? await startBot() : await stopBot()); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Bot control failed." }, { status: 400 }); } }
