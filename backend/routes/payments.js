const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const orderService = require('../services/orderService');
const paymentService = require('../services/paymentService');
const { isPositiveNumber } = require('../utils/validators');

const router = express.Router();

/** Lets the frontend decide between Razorpay Checkout and the plain button. */
router.get('/config', (req, res) => {
  res.json(paymentService.publicConfig());
});

router.post(
  '/create-order',
  requireAuth,
  requireRole('customer'),
  validateBody([
    { field: 'productId', test: isPositiveNumber, message: 'productId is required' },
    { field: 'quantity', test: isPositiveNumber, message: 'quantity is required' },
    {
      field: 'paymentMethod',
      optional: true,
      test: (v) => orderService.PAYMENT_METHODS.includes(String(v)),
      message: `paymentMethod must be one of: ${orderService.PAYMENT_METHODS.join(', ')}`,
    },
    {
      field: 'idempotencyKey',
      optional: true,
      test: (v) => v === undefined || (typeof v === 'string' && v.length > 0 && v.length <= 80),
      message: 'idempotencyKey must be a string of 1-80 characters',
    },
  ]),
  (req, res, next) => {
    paymentService
      .createOrder({
        customerId: Number(req.user.id),
        customer: db.find('customers', (c) => c.id === Number(req.user.id)),
        productId: req.body.productId,
        quantity: req.body.quantity,
        address: req.body.address,
        paymentMethod: req.body.paymentMethod,
        idempotencyKey: req.body.idempotencyKey,
      })
      .then((result) => res.status(201).json(result))
      .catch(next);
  },
);

router.post(
  '/verify',
  requireAuth,
  requireRole('customer'),
  validateBody([
    { field: 'orderId', test: isPositiveNumber, message: 'orderId is required' },
    { field: 'razorpayOrderId', test: (v) => typeof v === 'string' && v.length > 0, message: 'razorpayOrderId is required' },
    { field: 'razorpayPaymentId', test: (v) => typeof v === 'string' && v.length > 0, message: 'razorpayPaymentId is required' },
    {
      field: 'razorpaySignature',
      test: (v) => typeof v === 'string' && v.length > 0,
      message: 'razorpaySignature is required',
    },
  ]),
  (req, res, next) => {
    paymentService
      .verifyPayment({
        orderId: req.body.orderId,
        customerId: Number(req.user.id),
        razorpayOrderId: req.body.razorpayOrderId,
        razorpayPaymentId: req.body.razorpayPaymentId,
        razorpaySignature: req.body.razorpaySignature,
      })
      .then((result) => res.json(result))
      .catch(next);
  },
);

// Release the stock held by an order whose payment window was closed.
router.post(
  '/cancel-order',
  requireAuth,
  requireRole('customer'),
  validateBody([{ field: 'orderId', test: isPositiveNumber, message: 'orderId is required' }]),
  (req, res, next) => {
    Promise.resolve()
      .then(() => paymentService.cancelUnpaidOrder({ orderId: req.body.orderId, customerId: Number(req.user.id) }))
      .then((result) => res.json(result))
      .catch(next);
  },
);

module.exports = router;
