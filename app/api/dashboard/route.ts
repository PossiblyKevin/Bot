import { NextResponse } from "next/server";
import { snapshot } from "@/lib/paper-engine";

export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(snapshot()); }
