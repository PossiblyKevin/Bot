export type Side = "BUY" | "SELL";

export interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number; }
export interface Position { symbol: string; quantity: number; averageEntry: number; markPrice: number; unrealizedPnl: number; }
export interface Trade { id: string; createdAt: number; symbol: string; side: Side; quantity: number; price: number; notional: number; mode: "paper" | "live"; }
export interface DashboardSnapshot { symbol: string; price: number; change24h: number; candles: Candle[]; position: Position; trades: Trade[]; limits: { maxOrderNotional: number; maxDailyLoss: number }; mode: "paper" | "live-disabled"; }
