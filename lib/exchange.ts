import type { Candle, Side } from "./types";

export interface ExchangeAdapter {
  getTicker(symbol: string): Promise<{ price: number; change24h: number }>;
  getCandles(symbol: string, interval: string, limit: number, startTime?: number): Promise<Candle[]>;
  testOrder(input: { symbol: string; side: Side; quantity: number }): Promise<void>;
  placeMarketOrder(input: { symbol: string; side: Side; quantity: number }): Promise<{ orderId: string; executedQuantity: number; quoteQuantity: number }>;
}
