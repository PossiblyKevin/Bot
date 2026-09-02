import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { settings } from "./config";
import { canOpenNewTrade, recordRealizedPnl } from "./daily-loss";
import { ToobitAdapter } from "./toobit";

type Position = { symbol: string; quantity: number; entryPrice: number; stopPrice: number; highWatermark: number; trailingActive: boolean; openedAt: number };
type BotState = { running: boolean; message: string; breakout: Record<string, boolean>; positions: Position[]; updatedAt: number };
const stateFile = path.join(process.cwd(), "data", "bot-state.json");
let timer: ReturnType<typeof setInterval> | undefined;

async function load(): Promise<BotState> { try { return JSON.parse(await readFile(stateFile, "utf8")) as BotState; } catch { return { running: false, message: "Stopped", breakout: {}, positions: [], updatedAt: Date.now() }; } }
async function save(state: BotState) { state.updatedAt = Date.now(); await mkdir(path.dirname(stateFile), { recursive: true }); await writeFile(stateFile, JSON.stringify(state, null, 2), "utf8"); }
const base = (symbol: string) => symbol.replace("USDT", "");
const utcStart = () => { const now = new Date(); return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()); };

async function closePosition(client: ToobitAdapter, state: BotState, position: Position, price: number, reason: string) {
  const account = await client.getAccount(); const available = Number(account.balances.find(a => a.coin === base(position.symbol))?.free ?? 0); const quantity = Math.min(position.quantity, available);
  if (quantity <= 0) { state.message = `${position.symbol}: bot position is no longer available in Spot; manual reconciliation required.`; return; }
  await client.testOrder({ symbol: position.symbol, side: "SELL", quantity });
  await client.placeMarketOrder({ symbol: position.symbol, side: "SELL", quantity });
  const pnl = (price - position.entryPrice) * quantity; await recordRealizedPnl(pnl);
  state.positions = state.positions.filter(item => item.symbol !== position.symbol); state.message = `${position.symbol}: sold (${reason}); realized P&L ${pnl.toFixed(2)} USDT.`;
}

async function tickSymbol(client: ToobitAdapter, state: BotState, symbol: string) {
  const ticker = await client.getTicker(symbol); const active = state.positions.find(p => p.symbol === symbol);
  if (active) {
    active.highWatermark = Math.max(active.highWatermark, ticker.price);
    if (!active.trailingActive && ticker.price >= active.entryPrice * (1 + settings.trailingActivationPercent / 100)) { active.trailingActive = true; state.message = `${symbol}: +${settings.trailingActivationPercent}% reached; trailing stop is active.`; }
    const trailingStop = active.highWatermark * (1 - settings.trailingDistancePercent / 100);
    if (ticker.price <= active.stopPrice) await closePosition(client, state, active, ticker.price, "protective stop");
    else if (active.trailingActive && ticker.price <= trailingStop) await closePosition(client, state, active, ticker.price, "3% trailing stop");
    return;
  }
  const gate = await canOpenNewTrade(settings.botMaxAllocation, settings.botMaxDailyLossPercent);
  if (!gate.allowed) { state.message = `Daily loss circuit breaker is active (${gate.state.realizedPnlUsdt.toFixed(2)} USDT realized).`; return; }
  const opening = await client.getCandles(symbol, "1m", 5, utcStart()); const recent = await client.getCandles(symbol, "1m", 3);
  if (opening.length < 5 || recent.length < 2) { state.message = `${symbol}: waiting for enough 1-minute candles.`; return; }
  const rangeHigh = Math.max(...opening.map(c => c.high)); const latest = recent.at(-1)!; const prior = recent.at(-2)!;
  if (!state.breakout[symbol] && latest.close > rangeHigh) { state.breakout[symbol] = true; state.message = `${symbol}: breakout observed; waiting for retest.`; return; }
  if (!state.breakout[symbol] || !(latest.low <= rangeHigh && latest.close > rangeHigh && prior.close >= rangeHigh)) return;
  const account = await client.getAccount(); const freeUsdt = Number(account.balances.find(a => a.coin === "USDT")?.free ?? 0);
  if (freeUsdt < settings.botMaxAllocation) { state.message = `${symbol}: insufficient available Spot USDT (needs ${settings.botMaxAllocation}).`; return; }
  const stopPrice = latest.low; if (stopPrice >= ticker.price) { state.message = `${symbol}: retest stop is invalid; skipped.`; return; }
  await client.testOrder({ symbol, side: "BUY", quantity: settings.botMaxAllocation });
  const order = await client.placeMarketOrder({ symbol, side: "BUY", quantity: settings.botMaxAllocation });
  if (order.executedQuantity <= 0) { state.message = `${symbol}: order submitted but fill quantity was unavailable; reconcile before continuing.`; return; }
  state.positions.push({ symbol, quantity: order.executedQuantity, entryPrice: ticker.price, stopPrice, highWatermark: ticker.price, trailingActive: false, openedAt: Date.now() }); state.breakout[symbol] = false; state.message = `${symbol}: live entry filled; protective stop set at ${stopPrice}.`;
}

async function tick() { const state = await load(); if (!state.running) return; try { const client = new ToobitAdapter(); for (const symbol of settings.botMarkets) await tickSymbol(client, state, symbol); } catch (error) { state.message = error instanceof Error ? `Bot paused: ${error.message}` : "Bot paused due to an unknown error."; } await save(state); }

export async function startBot() { if (!settings.liveTradingEnabled || !settings.botConfirmLive) throw new Error("Set LIVE_TRADING_ENABLED=true and BOT_CONFIRM_LIVE=true in .env.local, then restart the app before starting live automation."); if (settings.botMaxAllocation !== 20) throw new Error("BOT_MAX_ALLOCATION_USDT must remain 20 for this configured bot."); const state = await load(); state.running = true; state.message = "Starting live opening-range worker…"; await save(state); if (!timer) timer = setInterval(tick, 20_000); await tick(); return load(); }
export async function stopBot() { if (timer) { clearInterval(timer); timer = undefined; } const state = await load(); state.running = false; state.message = "Stopped. Open positions remain on Toobit and are not closed automatically."; await save(state); return state; }
export async function botStatus() { return load(); }
