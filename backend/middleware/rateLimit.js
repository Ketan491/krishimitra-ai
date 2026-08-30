const rateLimit = require('express-rate-limit');
const config = require('../config');

const loginLimiter = rateLimit({
  windowMs: config.loginRateLimit.windowMs,
  max: config.loginRateLimit.max,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' },
});

const otpLimiter = rateLimit({
  windowMs: config.otpRateLimit.windowMs,
  max: config.otpRateLimit.max,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: config.apiRateLimit.windowMs,
  max: config.apiRateLimit.max,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

module.exports = { loginLimiter, otpLimiter, apiLimiter };
