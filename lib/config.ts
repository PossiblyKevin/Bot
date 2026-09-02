const numberSetting = (name: string, fallback: number) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number.`);
  return value;
};

export const settings = {
  liveTradingEnabled: process.env.LIVE_TRADING_ENABLED === "true",
  botConfirmLive: process.env.BOT_CONFIRM_LIVE === "true",
  maxOrderNotional: numberSetting("MAX_ORDER_NOTIONAL_USDT", 25),
  maxDailyLoss: numberSetting("MAX_DAILY_LOSS_USDT", 10),
  apiKey: process.env.TOOBIT_API_KEY,
  secretKey: process.env.TOOBIT_SECRET_KEY,
  botMarkets: (process.env.BOT_MARKETS ?? "BTCUSDT").split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean),
  botMaxAllocation: numberSetting("BOT_MAX_ALLOCATION_USDT", 100),
  botMaxDailyLossPercent: numberSetting("BOT_MAX_DAILY_LOSS_PERCENT", 3),
  trailingActivationPercent: numberSetting("BOT_TRAILING_ACTIVATION_PERCENT", 10),
  trailingDistancePercent: numberSetting("BOT_TRAILING_DISTANCE_PERCENT", 3)
};
