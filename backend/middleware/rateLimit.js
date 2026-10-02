const rateLimit = require('express-rate-limit');
const config = require('../config');

// Trusting only what a single trusted hop set keeps IP-based limits meaningful:
// a custom keyGenerator is what tells express-rate-limit to ignore the
// standardised Forwarded header and use Express's resolved req.ip instead.
const { ipKeyGenerator } = rateLimit;

/**
 * Key the buckets on the resolved client IP.
 *
 * `app.set('trust proxy', 1)` makes Express read X-Forwarded-For, so req.ip is
 * the real visitor instead of Render's shared proxy address. Without an
 * explicit keyGenerator, express-rate-limit v7 refuses to use the standardised
 * `Forwarded` header and logs ERR_ERL_FORWARDED_HEADER, so we supply one.
 *
 * ipKeyGenerator() is used rather than req.ip directly because IPv6 hands a
 * client a whole /64: keying on the exact address would let one visitor rotate
 * through billions of addresses and never hit a limit.
 */
const keyByClientIp = (req) => ipKeyGenerator(req.ip ?? '');

const loginLimiter = rateLimit({
  windowMs: config.loginRateLimit.windowMs,
  max: config.loginRateLimit.max,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: keyByClientIp,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' },
});

const otpLimiter = rateLimit({
  windowMs: config.otpRateLimit.windowMs,
  max: config.otpRateLimit.max,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: keyByClientIp,
  message: { error: 'Too many OTP requests. Please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: config.apiRateLimit.windowMs,
  max: config.apiRateLimit.max,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: keyByClientIp,
  message: { error: 'Too many requests. Please slow down.' },
});

module.exports = { loginLimiter, otpLimiter, apiLimiter };