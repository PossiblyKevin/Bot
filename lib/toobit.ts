import crypto from "node:crypto";
import { settings } from "./config";
import type { ExchangeAdapter } from "./exchange";
import type { Candle, Side } from "./types";

const BASE_URL = "https://api.toobit.com";

export class ToobitAdapter implements ExchangeAdapter {
  private credentials() {
    if (!settings.apiKey || !settings.secretKey) throw new Error("Toobit credentials are missing from server environment variables.");
    return { apiKey: settings.apiKey, secretKey: settings.secretKey };
  }

  private async request<T>(path: string, params: Record<string, string | number> = {}, signed = false): Promise<T> {
    const allParams = signed ? { ...params, timestamp: Date.now() } : params;
    const query = new URLSearchParams(Object.entries(allParams).map(([k, v]) => [k, String(v)])).toString();
    const headers: HeadersInit = {};
    if (signed) {
      const { apiKey, secretKey } = this.credentials();
      const signature = crypto.createHmac("sha256", secretKey).update(query).digest("hex");
      headers["X-BB-APIKEY"] = apiKey;
      const response = await fetch(`${BASE_URL}${path}?${query}&signature=${signature}`, { headers, cache: "no-store" });
      if (!response.ok) throw new Error(`Toobit request failed (${response.status}): ${await response.text()}`);
      return response.json() as Promise<T>;
    }
    const response = await fetch(`${BASE_URL}${path}${query ? `?${query}` : ""}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Toobit request failed (${response.status}): ${await response.text()}`);
    return response.json() as Promise<T>;
  }

  async getTicker(symbol: string) {
    const data = await this.request<Array<{ c: string; pcp: string }>>("/quote/v1/ticker/24hr", { symbol });
    return { price: Number(data[0]?.c), change24h: Number(data[0]?.pcp) };
  }

  async getCandles(symbol: string, interval: string, limit: number, startTime?: number): Promise<Candle[]> {
    const data = await this.request<string[][]>("/quote/v1/klines", { symbol, interval, limit, ...(startTime ? { startTime } : {}) });
    return data.map((c) => ({ time: Number(c[0]), open: Number(c[1]), high: Number(c[2]), low: Number(c[3]), close: Number(c[4]), volume: Number(c[5]) }));
  }

  async checkConnection() {
    return this.request<{ accountType: string }>("/api/v1/account/checkApiKey", {}, true);
  }

  async getAccount() {
    return this.request<{ balances: Array<{ coin: string; free: string; locked: string; total: string }> }>("/api/v1/account", {}, true);
  }

  async getFuturesBalance() {
    return this.request<Array<{ coin: string; free: string; locked: string; total: string }>>("/api/v1/futures/balance", {}, true);
  }

  async testOrder({ symbol, side, quantity }: { symbol: string; side: Side; quantity: number }) {
    await this.request("/api/v1/spot/orderTest", { symbol, side, type: "MARKET", quantity }, true);
  }

  async placeMarketOrder({ symbol, side, quantity }: { symbol: string; side: Side; quantity: number }) {
    const result = await this.request<{ orderId: string; executedQty?: string; cumulativeQuoteQty?: string }>("/api/v1/spot/order", { symbol, side, type: "MARKET", quantity }, true);
    return { orderId: result.orderId, executedQuantity: Number(result.executedQty ?? 0), quoteQuantity: Number(result.cumulativeQuoteQty ?? 0) };
  }
}
