import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type DailyState = { date: string; realizedPnlUsdt: number };
const file = path.join(process.cwd(), "data", "daily-risk.json");
const today = () => new Date().toISOString().slice(0, 10);

async function load(): Promise<DailyState> {
  try { const state = JSON.parse(await readFile(file, "utf8")) as DailyState; return state.date === today() ? state : { date: today(), realizedPnlUsdt: 0 }; }
  catch { return { date: today(), realizedPnlUsdt: 0 }; }
}

async function save(state: DailyState) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(state), "utf8"); }

export async function canOpenNewTrade(allocationUsdt: number, lossPercent: number) {
  const state = await load();
  return { allowed: state.realizedPnlUsdt > -(allocationUsdt * lossPercent / 100), state };
}

export async function recordRealizedPnl(pnlUsdt: number) { const state = await load(); state.realizedPnlUsdt += pnlUsdt; await save(state); return state; }
