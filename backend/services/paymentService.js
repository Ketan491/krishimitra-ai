const crypto = require('crypto');
const config = require('../config');
const db = require('../db');
const orderService = require('./orderService');
const { AppError } = require('../middleware/errors');

/**
 * Razorpay Checkout integration.
 *
 * Money rules that must never change:
 *  - The amount is always recomputed here from the stored product price; the
 *    browser never sends an amount it wants to pay.
 *  - An order is only marked paid after a valid HMAC signature check.
 *  - Verification is idempotent: retrying the same callback is a no-op.
 */

let client = null;
let injectedClient = null;

/** Dependency-injection seam so tests can drive the gateway without a network call. */
function setGateway(gateway) {
  injectedClient = gateway;
}

function isEnabled() {
  return Boolean(config.razorpay.keyId && config.razorpay.keySecret);
}

function getClient() {
  if (!isEnabled()) {
    throw new AppError(503, 'Online payments are not configured on this server.');
  }
  if (injectedClient) return injectedClient;
  if (!client) {
    // Required lazily so the module still loads when the package is absent.
    const Razorpay = require('razorpay');
    client = new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret });
  }
  return client;
}

/** Public, non-secret payment configuration for the frontend. */
function publicConfig() {
  return {
    enabled: isEnabled(),
    keyId: isEnabled() ? config.razorpay.keyId : '',
    currency: config.razorpay.currency,
    providerName: config.razorpay.providerName,
    codEnabled: config.cod.enabled,
    codMaxAmount: config.cod.maxAmount,
  };
}

/** Which methods the customer may pick right now, for a given cart value. */
function availableMethods(totalPrice = 0) {
  const methods = [];
  if (isEnabled()) methods.push('razorpay');
  if (config.cod.enabled && Number(totalPrice) <= config.cod.maxAmount) methods.push('cod');
  return methods;
}

/**
 * The COD rule itself lives in orderService so it is enforced for every order
 * creation path. Re-exported here for callers of the payment service.
 */
const assertCodAllowed = orderService.assertCodAllowed;

function assertOrderPayableBy(order, customerId) {
  if (!order) throw new AppError(404, 'Order not found');
  if (Number(order.customerId) !== Number(customerId)) {
    throw new AppError(403, 'You can only pay for your own orders.');
  }
  if (order.status === 'Cancelled') throw new AppError(400, 'This order was cancelled and cannot be paid for.');
}

function toPaise(amount) {
  return Math.round(Number(amount) * 100);
}

/**
 * Create an order for checkout.
 *
 * For `razorpay` this also opens a gateway order and returns everything the
 * browser needs to launch Checkout. For `cod` the order is simply recorded as
 * pending/unpaid — no gateway is contacted.
 *
 * `idempotencyKey` makes retries safe: the same key always returns the same
 * order instead of placing a second one.
 */
async function createOrder({ customerId, customer, productId, quantity, address, paymentMethod, idempotencyKey }) {
  const method = orderService.normalizePaymentMethod(paymentMethod, 'razorpay');
  if (method === 'razorpay' && !isEnabled()) {
    throw new AppError(503, 'Online payments are not configured on this server.');
  }

  const order = orderService.placeOrder({
    customerId,
    productId,
    quantity,
    address,
    paymentMethod: method,
    idempotencyKey,
  });

  // Cash on Delivery stops here: the order stands as Pending / Unpaid.
  if (method === 'cod') {
    assertCodAllowed(order.totalPrice);
    return {
      order,
      paymentMethod: 'cod',
      amount: order.totalPrice,
      currency: config.razorpay.currency,
      amountInPaise: toPaise(order.totalPrice),
    };
  }

  const amountInPaise = toPaise(order.totalPrice);

  // A retried request already has a gateway order attached. Re-opening the
  // Razorpay order would leave two payable handles for one order, so reuse it.
  if (order.razorpayOrderId) {
    return {
      order,
      paymentMethod: 'razorpay',
      razorpayOrderId: order.razorpayOrderId,
      amount: order.totalPrice,
      currency: config.razorpay.currency,
      amountInPaise,
      keyId: config.razorpay.keyId,
      replayed: true,
    };
  }

  const receipt = `km_order_${order.id}`;

  try {
    const razorpayOrder = await getClient().orders.create({
      amount: amountInPaise,
      currency: config.razorpay.currency,
      receipt,
      notes: { orderId: String(order.id), customerId: String(customerId) },
    });

    db.update('orders', order.id, {
      paymentStatus: 'pending',
      paymentProvider: 'razorpay',
      razorpayOrderId: razorpayOrder.id,
    });

    return {
      order: orderService.enrichOrder(db.find('orders', (o) => o.id === order.id)),
      paymentMethod: 'razorpay',
      razorpayOrderId: razorpayOrder.id,
      amount: order.totalPrice,
      currency: config.razorpay.currency,
      amountInPaise,
      keyId: config.razorpay.keyId,
      prefill: {
        name: customer?.name || '',
        email: customer?.email || '',
        contact: customer?.mobile || '',
      },
    };
  } catch (err) {
    // Roll the order back so a failed gateway call never leaves stock held or a
    // phantom order in the customer's history.
    try {
      orderService.discardUnpaidOrder(order.id);
    } catch (rollbackErr) {
      console.error('payment rollback failed', rollbackErr);
    }
    throw new AppError(502, 'Could not start the payment. Please try again.');
  }
}

function expectedSignature(razorpayOrderId, razorpayPaymentId) {
  return crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
}

function isValidSignature(razorpayOrderId, razorpayPaymentId, signature) {
  if (!isEnabled()) return false;
  if (!razorpayOrderId || !razorpayPaymentId || !signature) return false;
  const expected = expectedSignature(razorpayOrderId, razorpayPaymentId);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verify the Checkout callback and mark the order paid. Safe to call twice.
 */
async function verifyPayment({ orderId, customerId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!isEnabled()) throw new AppError(503, 'Online payments are not configured on this server.');

  const order = db.find('orders', (o) => o.id === Number(orderId));
  assertOrderPayableBy(order, customerId);

  // A Cash on Delivery order is settled by the farmer, never by a gateway
  // callback. Ignoring this keeps a stray/forged callback from marking a COD
  // order as paid.
  if (order.paymentMethod === 'cod') {
    throw new AppError(400, 'This is a Cash on Delivery order and is settled when the goods are delivered.');
  }

  // Already settled (e.g. the customer retried the callback) — report success
  // instead of erroring, so a duplicate webhook or double click is harmless.
  if (order.paymentStatus === 'paid') {
    if (order.razorpayPaymentId && razorpayPaymentId && order.razorpayPaymentId !== razorpayPaymentId) {
      throw new AppError(409, 'This order was already paid with a different payment.');
    }
    return { success: true, order: orderService.enrichOrder(order), alreadyProcessed: true };
  }

  if (!razorpayOrderId) throw new AppError(400, 'razorpayOrderId is required');
  if (!razorpayPaymentId) throw new AppError(400, 'razorpayPaymentId is required');

  if (!order.razorpayOrderId) {
    throw new AppError(400, 'This order has no online payment in progress. Place the order again.');
  }
  if (order.razorpayOrderId !== razorpayOrderId) {
    throw new AppError(400, 'This payment does not belong to this order.');
  }

  if (!isValidSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    db.update('orders', order.id, { paymentStatus: 'failed' });
    throw new AppError(400, 'Payment verification failed. If you were charged, contact support.');
  }

  // The amount we asked for must match what Razorpay actually collected.
  const expectedPaise = toPaise(order.totalPrice);
  let gatewayPaise = NaN;
  try {
    const gateway = await getClient().orders.fetch(razorpayOrderId);
    gatewayPaise = Number(gateway?.amount);
  } catch {
    // A gateway read failure must not block an otherwise valid signature.
    gatewayPaise = NaN;
  }
  if (Number.isFinite(gatewayPaise) && gatewayPaise !== expectedPaise) {
    throw new AppError(400, 'Payment amount does not match the order total.');
  }

  const paidAt = new Date().toISOString();
  const updated = db.update('orders', order.id, {
    paymentStatus: 'paid',
    razorpayPaymentId,
    paidAt,
  });

  return { success: true, order: orderService.enrichOrder(updated) };
}

/**
 * Release an order whose online payment was abandoned (the customer closed the
 * Checkout window). Without this the pending order would hold stock forever.
 * COD orders are real orders, so they are never discarded here.
 */
function cancelUnpaidOrder({ orderId, customerId }) {
  const order = db.find('orders', (o) => o.id === Number(orderId));
  assertOrderPayableBy(order, customerId);

  if (order.paymentStatus === 'paid') {
    throw new AppError(400, 'This order was already paid and cannot be cancelled here.');
  }
  if (order.paymentMethod === 'cod') {
    throw new AppError(400, 'This is a Cash on Delivery order — cancel it from My Orders instead.');
  }
  orderService.discardUnpaidOrder(order.id);
  return { success: true };
}

module.exports = {
  isEnabled,
  publicConfig,
  availableMethods,
  createOrder,
  verifyPayment,
  cancelUnpaidOrder,
  isValidSignature,
  expectedSignature,
  setGateway,
};
