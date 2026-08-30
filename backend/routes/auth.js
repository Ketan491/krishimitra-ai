const express = require('express');
const { loginLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/auth');
const { AppError } = require('../middleware/errors');
const authService = require('../services/authService');

const router = express.Router();

router.post('/register', (req, res, next) => {
  try {
    const result = authService.register(req.body || {});
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginLimiter, (req, res, next) => {
  try {
    res.json(authService.login(req.body || {}));
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res, next) => {
  try {
    res.json({ role: req.user.role, user: authService.profileFor(req.user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
