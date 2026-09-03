import CryptoJS from 'crypto-js';
import { DEFAULT_CONFIG } from './config';

interface OrderParams {
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  price?: number;
  marketType: 'spot' | 'futures';
}

export class ToobitTrader {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    // Load from LocalStorage if available, fallback to config file
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

  private generateSignature(queryString: string): string {
    return CryptoJS.HmacSHA256(queryString, this.apiSecret).toString(CryptoJS.enc.Hex);
  }

  public async placeOrder(params: OrderParams): Promise<any> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error("Missing API Key or Secret Key! Please save credentials first.");
    }

    const endpoint = params.marketType === 'spot' 
      ? '/api/v1/spot/order' 
      : '/api/v1/futures/order';

    const timestamp = Date.now();
    
    // Construct query parameters map according to Toobit documentation specs
    const queryParams: Record<string, any> = {
      symbol: params.symbol.trim(),
      side: params.marketType === 'futures' ? (params.side === 'BUY' ? 'BUY_OPEN' : 'SELL_OPEN') : params.side,
      type: params.type,
      quantity: params.quantity,
      recvWindow: 10000,
      timestamp: timestamp
    };

    if (params.type === 'LIMIT' && params.price) {
      queryParams.price = params.price;
      queryParams.timeInForce = 'GTC';
    }

    // Sort and build query string for signature generation
    const sortedKeys = Object.keys(queryParams).sort();
    const queryString = sortedKeys.map(key => `${key}=${queryParams[key]}`).join('&');
    
    const signature = this.generateSignature(queryString);
    const finalQueryString = `${queryString}&signature=${signature}`;

    // Note: Due to browser CORS policies when calling direct exchange REST APIs, 
    // a lightweight CORS plugin/extension or a server-side proxy route might be needed 
    // if Toobit blocks direct browser fetch requests.
    const url = `${this.baseUrl}${endpoint}?${finalQueryString}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-BB-APIKEY': this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.retMsg || data.msg || JSON.stringify(data));
    }
    return data;
  }
}