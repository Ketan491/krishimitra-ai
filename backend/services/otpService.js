const crypto = require('crypto');
const config = require('../config');
const db = require('../db');
const { AppError } = require('../middleware/errors');
const { isValidMobile } = require('../utils/validators');

const store = new Map();

function keyFor(role, mobile) {
  return `${role}:${mobile.trim()}`;
}

function accountFor(role, mobile) {
  const table = role === 'farmer' ? 'farmers' : 'customers';
  return db.find(table, (u) => u.mobile === mobile.trim()) || null;
}

function prune() {
  const now = Date.now();
  for (const [k, entry] of store) {
    if (now > entry.expiresAt) store.delete(k);
  }
}

function issueOtp(role, mobile) {
  if (!['farmer', 'customer'].includes(role)) {
    throw new AppError(400, 'OTP login is only available for Farmer and Customer accounts.');
  }

  const clean = mobile.trim();
  if (!isValidMobile(clean)) {
    throw new AppError(400, 'Please enter a valid 10-digit Indian mobile number (starting 6-9).');
  }

  const user = accountFor(role, clean);
  if (!user) throw new AppError(404, 'No account found for this mobile. Please register first.');

  prune();

  const now = Date.now();
  const key = keyFor(role, clean);
  const prev = store.get(key);

  if (prev && now - prev.sentAt < config.otpCooldownMs) {
    throw new AppError(429, 'Please wait a moment before requesting another OTP.');
  }

  const window = (prev?.window || []).filter((t) => now - t < config.otpWindowMs);
  if (window.length >= config.otpMaxPerWindow) {
    throw new AppError(429, 'Too many OTP requests. Please try again later.');
  }
  window.push(now);

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  store.set(key, { code, sentAt: now, expiresAt: now + config.otpTtlMs, window });

  return { code, expiresInSec: Math.round(config.otpTtlMs / 1000) };
}

function consumeOtp(role, mobile, code) {
  const clean = mobile.trim();
  if (!isValidMobile(clean)) {
    throw new AppError(400, 'Please enter a valid 10-digit Indian mobile number (starting 6-9).');
  }

  const key = keyFor(role, clean);
  const entry = store.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    store.delete(key);
    throw new AppError(401, 'This OTP has expired. Please request a new one.');
  }
  if (String(code || '').trim() !== entry.code) {
    throw new AppError(401, 'Invalid OTP. Please check and try again.');
  }

  store.delete(key);
  const user = accountFor(role, clean);
  if (!user) throw new AppError(401, 'Account not found. Please register first.');
  return user;
}

module.exports = { issueOtp, consumeOtp };