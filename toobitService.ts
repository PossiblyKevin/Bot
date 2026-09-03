import CryptoJS from 'crypto-js';
import { DEFAULT_CONFIG } from './config';

interface BotParams {
  symbol: string;
  strategyType: string;
  investment: number;
  leverage: number;
}

export class ToobitBotService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = localStorage.getItem('toobit_api_key') || DEFAULT_CONFIG.apiKey;
    this.apiSecret = localStorage.getItem('toobit_api_secret') || DEFAULT_CONFIG.apiSecret;
    this.baseUrl = DEFAULT_CONFIG.baseUrl;
  }

  public setCredentials(key: string, secret: string) {
    this.apiKey = key.trim();
    this.apiSecret = secret.trim();
    localStorage.setItem('toobit_api_key', this.apiKey);
    localStorage.setItem('toobit_api_secret', this.apiSecret);
  }

  public hasCredentials(): boolean {
    return Boolean(this.apiKey && this.apiSecret);
  }

  private generateSignature(queryString: string): string {
    return CryptoJS.HmacSHA256(queryString, this.apiSecret).toString(CryptoJS.enc.Hex);
  }

  public async fetchAccountBalance(): Promise<any> {
    if (!this.hasCredentials()) throw new Error("API Credentials not configured.");
    
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}&recvWindow=10000`;
    const signature = this.generateSignature(queryString);
    // Updated to Toobit's verified account/balance asset endpoint path
    const url = `${this.baseUrl}/api/v1/account?${queryString}&signature=${signature}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-BB-APIKEY': this.apiKey }
    });

    const text = await res.text();
    if (!text) {
      throw new Error("Empty response received from Toobit server.");
    }

    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.retMsg || data.msg || 'Failed to fetch balance');
    return data;
  }

  public async deployBot(params: BotParams): Promise<any> {
    if (!this.hasCredentials()) throw new Error("API Credentials not configured.");

    const timestamp = Date.now();
    const queryParams: Record<string, any> = {
      symbol: params.symbol,
      strategyType: params.strategyType,
      investment: params.investment,
      leverage: params.leverage,
      timestamp: timestamp,
      recvWindow: 10000
    };

    const sortedKeys = Object.keys(queryParams).sort();
    const queryString = sortedKeys.map(k => `${k}=${queryParams[k]}`).join('&');
    const signature = this.generateSignature(queryString);
    const url = `${this.baseUrl}/api/v1/futures/strategy/create?${queryString}&signature=${signature}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-BB-APIKEY': this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const text = await res.text();
    if (!text) throw new Error("Empty response received from Toobit server.");
    
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.retMsg || data.msg || JSON.stringify(data));
    return data;
  }
}