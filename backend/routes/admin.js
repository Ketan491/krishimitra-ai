const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { AppError } = require('../middleware/errors');
const statsService = require('../services/statsService');
const productService = require('../services/productService');
const userService = require('../services/userService');
const orderService = require('../services/orderService');
const schemeService = require('../services/schemeService');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/summary', (req, res) => {
  res.json(statsService.adminSummary());
});

router.get('/users', (req, res) => {
  res.json(userService.listUsers(req.query));
});

router.get('/farmers', (req, res) => {
  res.json(db.all('farmers').map(({ passwordHash, ...f }) => f));
});

router.get('/customers', (req, res) => {
  res.json(db.all('customers').map(({ passwordHash, ...c }) => c));
});

router.put('/users/:role/:id', (req, res, next) => {
  try {
    res.json(userService.updateUser(req.params.role, req.params.id, req.body || {}, req.user, req.user.username));
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:role/:id', (req, res, next) => {
  try {
    res.json(userService.removeUser(req.params.role, req.params.id, req.user, req.user.username));
  } catch (err) {
    next(err);
  }
});

router.get('/products', (req, res) => {
  res.json(productService.listAll());
});

router.put('/products/:id/approve', (req, res, next) => {
  try {
    const body = req.body || {};
    const isTrue = body.approved === true || body.approved === 'true';
    const isFalse = body.approved === false || body.approved === 'false';
    if (!isTrue && !isFalse) return next(new AppError(400, 'approved must be true or false'));
    res.json(productService.setApproval(req.params.id, isTrue, req.user, req.user.username));
  } catch (err) {
    next(err);
  }
});

router.put('/products/:id', (req, res, next) => {
  try {
    res.json(productService.updateById(req.params.id, req.body || {}, null, req.user));
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:id', (req, res, next) => {
  try {
    res.json(productService.removeById(req.params.id, req.user, req.user.username));
  } catch (err) {
    next(err);
  }
});

router.get('/orders', (req, res) => {
  res.json(orderService.listAll());
});

router.put('/orders/:id/status', (req, res, next) => {
  try {
    res.json(orderService.updateStatus(req.params.id, req.body.status, req.body.note));
  } catch (err) {
    next(err);
  }
});

router.get('/reviews', (req, res) => {
  res.json(
    db
      .all('reviews')
      .map((r) => {
        const product = db.find('products', (p) => p.id === r.productId);
        const customer = db.find('customers', (c) => c.id === r.customerId);
        return { ...r, cropName: product?.cropName || 'Unknown', customerName: customer?.name || 'Customer' };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  );
});

router.delete('/reviews/:id', (req, res, next) => {
  try {
    const review = db.find('reviews', (r) => r.id === Number(req.params.id));
    if (!review) return next(new AppError(404, 'Review not found'));
    db.remove('reviews', review.id);
    db.insert('auditLog', {
      admin: req.user.username,
      action: 'REVIEW_DELETE',
      detail: `Removed review #${review.id}`,
      createdAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/schemes', (req, res) => {
  res.json(schemeService.list());
});

router.get('/audit', (req, res) => {
  res.json(db.all('auditLog').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.get('/export', (req, res) => {
  const data = db.load();
  res.setHeader('Content-Disposition', 'attachment; filename="krishimitra-backup.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data, null, 2));
});

module.exports = router;
