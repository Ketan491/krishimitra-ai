const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { AppError } = require('../middleware/errors');
const orderService = require('../services/orderService');

const router = express.Router();

function assertAllowed(req, res, next, kind, ownerId) {
  if (req.user.role === 'admin') return;
  if (req.user.role === kind && Number(req.user.id) === Number(ownerId)) return;
  return next(new AppError(403, 'You can only access your own orders.'));
}

router.post('/', requireAuth, requireRole('customer'), (req, res, next) => {
  try {
    const customer = db.find('customers', (c) => c.id === Number(req.user.id));
    if (!customer) return next(new AppError(404, 'Customer not found'));

    const address =
      req.body.address || customer.addresses?.find((a) => a.isDefault)?.fullAddress || customer.address || '';
    const order = orderService.placeOrder({
      customerId: Number(req.user.id),
      productId: req.body.productId,
      quantity: req.body.quantity,
      address,
    });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

router.get('/customer/:id', requireAuth, requireRole('customer', 'admin'), (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && Number(req.user.id) !== Number(req.params.id)) {
      return next(new AppError(403, 'You can only access your own orders.'));
    }
    res.json(orderService.listForCustomer(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/farmer/:id', requireAuth, requireRole('farmer', 'admin'), (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && Number(req.user.id) !== Number(req.params.id)) {
      return next(new AppError(403, 'You can only access your own orders.'));
    }
    res.json(orderService.listForFarmer(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id/status', requireAuth, requireRole('farmer', 'admin'), (req, res, next) => {
  try {
    const order = db.find('orders', (o) => o.id === Number(req.params.id));
    if (!order) return next(new AppError(404, 'Order not found'));
    if (req.user.role !== 'admin' && Number(req.user.id) !== order.farmerId) {
      return next(new AppError(403, 'Only the selling farmer can update this order.'));
    }
    res.json(orderService.updateStatus(req.params.id, req.body.status, req.body.note));
  } catch (err) {
    next(err);
  }
});

router.put('/:id/cancel', requireAuth, requireRole('customer', 'farmer', 'admin'), (req, res, next) => {
  try {
    const order = db.find('orders', (o) => o.id === Number(req.params.id));
    if (!order) return next(new AppError(404, 'Order not found'));
    const allowed =
      req.user.role === 'admin' ||
      (req.user.role === 'customer' && Number(req.user.id) === order.customerId) ||
      (req.user.role === 'farmer' && Number(req.user.id) === order.farmerId);
    if (!allowed) return next(new AppError(403, 'You can only cancel your own orders.'));
    res.json(orderService.cancelOrder(req.params.id, req.body.note));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/review', requireAuth, requireRole('customer'), (req, res, next) => {
  try {
    const result = orderService.reviewOrder(req.params.id, {
      customerId: Number(req.user.id),
      productId: req.body.productId,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
