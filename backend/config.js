require('dotenv').config();

function int(name, fallback) {
  const v = process.env[name];
  const n = Number(v);
  return v && !Number.isNaN(n) ? n : fallback;
}

function num(name, fallback) {
  const n = Number(process.env[name]);
  return process.env[name] && Number.isFinite(n) ? n : fallback;
}

function list(name, fallback = []) {
  const v = process.env[name];
  if (!v) return fallback;
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = {
  port: int('PORT', 5000),
  jwtSecret: process.env.JWT_SECRET || 'krishimitra-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  corsOrigins: list('CORS_ORIGIN', ['http://localhost:5173', 'http://127.0.0.1:5173']),  loginRateLimit: {
    windowMs: int('LOGIN_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    max: int('LOGIN_RATE_LIMIT_MAX', 20),
  },
  otpTtlMs: int('OTP_TTL_SEC', 5 * 60) * 1000,
  otpCooldownMs: int('OTP_COOLDOWN_SEC', 60) * 1000,
  otpMaxPerWindow: int('OTP_MAX_PER_WINDOW', 5),
  otpWindowMs: int('OTP_WINDOW_MIN', 15) * 60 * 1000,
  otpRateLimit: {
    windowMs: int('OTP_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    max: int('OTP_RATE_LIMIT_MAX', 15),
  },
  apiRateLimit: {
    windowMs: int('API_RATE_LIMIT_WINDOW_MS', 60 * 1000),
    max: int('API_RATE_LIMIT_MAX', 300),
  },
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxUploadMb: int('MAX_UPLOAD_MB', 3),
  dbFile: process.env.DB_FILE || './data.json',
  weatherProvider: process.env.WEATHER_PROVIDER || 'mock',
  openWeatherKey: process.env.OPENWEATHER_API_KEY || '',

  // Razorpay Checkout. Without both keys the API stays in "cod" mode and the
  // frontend falls back to the original place-order button, so the demo keeps
  // working out of the box.
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    currency: process.env.RAZORPAY_CURRENCY || 'INR',
    providerName: process.env.RAZORPAY_PROVIDER_NAME || 'KrishiMitra AI',
    get enabled() {
      return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    },
  },

  // Cash on Delivery. Always available as a fallback, but a merchant can cap
  // the order value above which COD is refused (risk control).
  cod: {
    enabled: String(process.env.COD_ENABLED ?? 'true').toLowerCase() !== 'false',
    maxAmount: num('COD_MAX_AMOUNT', 25000),
  },
};
