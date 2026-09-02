import { settings } from "./config";
import type { DashboardSnapshot, Side, Trade } from "./types";

const state = {
  price: 64820.42,
  trades: [] as Trade[],
  quantity: 0,
  averageEntry: 0
};

function candles() {
  const result = [];
  let price = state.price * 0.985;
  for (let i = 0; i < 48; i++) {
    const open = price;
    const movement = (Math.sin(i * 1.8) + Math.cos(i * 0.73)) * 155;
    const close = Math.max(100, open + movement);
    result.push({ time: Date.now() - (47 - i) * 3_600_000, open, high: Math.max(open, close) + 95, low: Math.min(open, close) - 95, close, volume: 12 + (i % 9) * 3.2 });
    price = close;
  }
  result[result.length - 1].close = state.price;
  return result;
}

export function snapshot(): DashboardSnapshot {
  const pnl = state.quantity * (state.price - state.averageEntry);
  return { symbol: "BTCUSDT", price: state.price, change24h: 2.84, candles: candles(), position: { symbol: "BTCUSDT", quantity: state.quantity, averageEntry: state.averageEntry, markPrice: state.price, unrealizedPnl: pnl }, trades: state.trades.slice(0, 8), limits: { maxOrderNotional: settings.maxOrderNotional, maxDailyLoss: settings.maxDailyLoss }, mode: settings.liveTradingEnabled ? "live-disabled" : "paper" };
}

export function paperOrder(side: Side, notional: number): Trade {
  if (notional > settings.maxOrderNotional) throw new Error(`Order exceeds the ${settings.maxOrderNotional} USDT safety limit.`);
  const quantity = notional / state.price;
  if (side === "BUY") {
    const totalCost = state.averageEntry * state.quantity + notional;
    state.quantity += quantity;
    state.averageEntry = totalCost / state.quantity;
  } else {
    if (quantity > state.quantity) throw new Error("Paper sell quantity exceeds the current position.");
    state.quantity -= quantity;
    if (state.quantity === 0) state.averageEntry = 0;
  }
  const trade: Trade = { id: crypto.randomUUID(), createdAt: Date.now(), symbol: "BTCUSDT", side, quantity, price: state.price, notional, mode: "paper" };
  state.trades.unshift(trade);
  return trade;
}
