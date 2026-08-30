const db = require('../db');
const bcrypt = require('bcryptjs');
const { AppError } = require('../middleware/errors');
const { signToken, comparePassword, safeUser, adminCheck } = require('../middleware/auth');
const { issueOtp, consumeOtp } = require('./otpService');
const {
  isValidMobile,
  isValidPassword,
  sanitizeName,
  sanitizeText,
  isNonNegativeNumber,
} = require('../utils/validators');

function hashPassword(pw) {
  return bcrypt.hashSync(pw, 8);
}

function buildToken(user) {
  return signToken({ id: user.id, role: user.role });
}

function register({ role, name, mobile, password, ...extra }) {
  if (!['farmer', 'customer'].includes(role)) {
    throw new AppError(400, "role must be 'farmer' or 'customer'");
  }

  const cleanName = sanitizeName(name);
  if (cleanName.length < 2) throw new AppError(400, 'Please enter a valid full name (at least 2 letters).');
  if (!isValidMobile(mobile))
    throw new AppError(400, 'Please enter a valid 10-digit Indian mobile number (starting 6-9).');
  if (!isValidPassword(password)) throw new AppError(400, 'Password must be between 4 and 72 characters.');

  const table = role === 'farmer' ? 'farmers' : 'customers';
  if (db.find(table, (u) => u.mobile === mobile.trim())) {
    throw new AppError(409, 'An account with this mobile number already exists');
  }

  const passwordHash = hashPassword(password);
  let row;
  if (role === 'farmer') {
    if (extra.landSize !== undefined && !isNonNegativeNumber(extra.landSize)) {
      throw new AppError(400, 'Land size must be a positive number');
    }
    row = db.insert('farmers', {
      name: cleanName,
      mobile: mobile.trim(),
      passwordHash,
      location: sanitizeText(extra.location, 100),
      soilType: sanitizeText(extra.soilType, 30),
      landSize: Number(extra.landSize) || 0,
      irrigationType: sanitizeText(extra.irrigationType, 30),
      preferredCrops: Array.isArray(extra.preferredCrops) ? extra.preferredCrops.slice(0, 8) : [],
      language: sanitizeText(extra.language, 10) || 'en',
      bio: sanitizeText(extra.bio, 300),
      avatarUrl: '',
      createdAt: new Date().toISOString(),
    });
  } else {
    row = db.insert('customers', {
      name: cleanName,
      mobile: mobile.trim(),
      passwordHash,
      address: sanitizeText(extra.address, 255),
      addresses: extra.address
        ? [
            {
              id: 1,
              label: 'Home',
              fullAddress: sanitizeText(extra.address, 255),
              pincode: sanitizeText(extra.pincode, 10),
              phone: mobile.trim(),
              isDefault: true,
            },
          ]
        : [],
      avatarUrl: '',
      createdAt: new Date().toISOString(),
    });
  }

  const user = safeUser(row);
  return { token: buildToken({ id: row.id, role }), role, user };
}

function findByCredential(table, credential) {
  const trimmed = credential.trim();
  return db.find(table, (u) => {
    if (u.mobile === trimmed) return true;
    return Boolean(u.email) && u.email.toLowerCase() === trimmed.toLowerCase();
  });
}

function login({ role, mobile, password, identifier }) {
  const credential = String(identifier ?? mobile ?? '').trim();
  if (!credential || !password) throw new AppError(400, 'Mobile/username and password are required');

  if (role === 'admin') {
    if (!adminCheck(credential, password)) throw new AppError(401, 'Invalid admin credentials');
    const token = signToken({ id: 1, role: 'admin', username: credential });
    return { token, role: 'admin', user: { id: 1, username: credential } };
  }

  if (!['farmer', 'customer'].includes(role)) {
    throw new AppError(400, "role must be 'farmer', 'customer' or 'admin'");
  }

  const table = role === 'farmer' ? 'farmers' : 'customers';
  const user = findByCredential(table, credential);
  if (!user || !comparePassword(password, user.passwordHash)) {
    throw new AppError(401, 'Invalid mobile/email or password');
  }

  const token = signToken({ id: user.id, role });
  return { token, role, user: safeUser(user) };
}

function sendOtp({ role, mobile }) {
  const { code, expiresInSec } = issueOtp(role, mobile || '');
  return { success: true, devOtp: code, expiresInSec };
}

function verifyOtp({ role, mobile, otp }) {
  const user = consumeOtp(role, mobile || '', otp || '');
  const token = signToken({ id: user.id, role });
  return { token, role, user: safeUser(user) };
}

function profileFor(reqUser) {
  if (!reqUser) throw new AppError(401, 'Authentication required.');
  if (reqUser.role === 'admin') {
    return { id: Number(reqUser.id) || 1, username: reqUser.username || 'admin', role: 'admin' };
  }
  const table = reqUser.role === 'farmer' ? 'farmers' : 'customers';
  const user = db.find(table, (u) => u.id === Number(reqUser.id));
  if (!user) throw new AppError(401, 'Account not found. Please log in again.');
  return safeUser(user);
}

module.exports = { register, login, sendOtp, verifyOtp, profileFor, buildToken, hashPassword };
