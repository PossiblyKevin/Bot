# Axiom Trade

A safety-first Next.js trading dashboard, initially configured for paper trading.

## Start locally

1. Copy `.env.example` to `.env.local`.
2. Leave `LIVE_TRADING_ENABLED=false`.
3. Install dependencies with `npm install`.
4. Start the dashboard with `npm run dev`.

Open `http://localhost:3000`. The dashboard intentionally uses simulated data and records paper orders only.

## Connecting Toobit

`lib/toobit.ts` is the server-side Toobit exchange adapter. It signs `TRADE` requests with HMAC-SHA256 and sends the API key only in the `X-BB-APIKEY` header. Do not import this adapter into a client component.

Before enabling any live order path, add durable order storage, user authentication, WebSocket reconciliation, a circuit breaker, a maximum open-position rule, stop-loss handling, and independent strategy backtests. `LIVE_TRADING_ENABLED` alone does not turn on live order placement in this starter; that is intentional.

The dashboard's **Test connection** button sends a signed request to Toobit's account-key endpoint. It does not submit an order. The local daily circuit breaker records realized bot P&L in `data/daily-risk.json` and blocks new bot entries when the configured daily loss threshold is reached; that file is deliberately excluded from version control.

## Strategy design

Put strategy rules behind a service that consumes an `ExchangeAdapter`, not the Toobit client. That preserves portability: a future Binance or Coinbase adapter can expose the same contract without changing the strategy.
