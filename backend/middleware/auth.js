const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../db');
const { AppError } = require('./errors');

function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function getToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (req.headers['x-auth-token']) return req.headers['x-auth-token'];
  return null;
}

function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return next(new AppError(401, 'Authentication required. Please log in.'));
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return next(new AppError(401, 'Your session has expired. Please log in again.'));
  }
}

function optionalAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return next();
  try {
    req.user = jwt.verify(token, config.jwtSecret);
  } catch {}
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError(401, 'Authentication required. Please log in.'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action.'));
    }
    return next();
  };
}

function comparePassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function safeUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

function adminCheck(username, password) {
  return username === config.adminUsername && password === config.adminPassword;
}

module.exports = {
  signToken,
  requireAuth,
  requireRole,
  optionalAuth,
  comparePassword,
  safeUser,
  adminCheck,
  db,
};
