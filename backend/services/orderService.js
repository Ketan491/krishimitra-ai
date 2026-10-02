const db = require('../db');
const config = require('../config');
const { AppError } = require('../middleware/errors');
const { isPositiveNumber, sanitizeText } = require('../utils/validators');

const STATUS_FLOW = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Reviewed'];
const CANCELLABLE = ['Pending', 'Confirmed'];

const PAYMENT_METHODS = ['razorpay', 'cod'];
/** How long an idempotency key is remembered, so a client can safely retry. */
const IDEMPOTENCY_TTL_MS = 30 * 60 * 1000;

function normalizePaymentMethod(value, fallback = 'cod') {
  const method = String(value ?? '').trim().toLowerCase();
  if (!method) return fallback;
  if (!PAYMENT_METHODS.includes(method)) {
    throw new AppError(400, `paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
  }
  return method;
}

/**
 * Cash on Delivery is optional and capped, so the farmer is not asked to carry
 * an unbounded amount of cash. Enforced here — the single place every order is
 * created — so no caller can reserve stock for an impossible COD order.
 */
function assertCodAllowed(totalPrice) {
  if (!config.cod.enabled) {
    throw new AppError(400, 'Cash on Delivery is currently unavailable. Please pay online.');
  }
  if (totalPrice > config.cod.maxAmount) {
    throw new AppError(
      400,
      `Cash on Delivery is only available up to ₹${config.cod.maxAmount}. Please pay online.`,
    );
  }
  return true;
}

/**
 * Find an order previously created with the same idempotency key so a double
 * click, a retried request or a flaky network cannot create two orders.
 *
 * Scoped to the customer and matched against the intended basket, so a
 * colliding key can never hand one shopper another shopper's order.
 */
function findByIdempotencyKey(key, { customerId, productId, quantity } = {}) {
  if (!key) return null;
  const existing = db.find('orders', (o) => o.idempotencyKey === key);
  if (!existing) return null;
  if (Number(existing.customerId) !== Number(customerId)) {
    throw new AppError(409, 'This idempotency key belongs to a different order.');
  }
  const age = Date.now() - new Date(existing.orderDate).getTime();
  if (age > IDEMPOTENCY_TTL_MS) return null;
  if (
    (productId !== undefined && Number(existing.productId) !== Number(productId)) ||
    (quantity !== undefined && Number(existing.quantity) !== Number(quantity))
  ) {
    throw new AppError(409, 'This idempotency key was already used for a different order.');
  }
  return existing;
}

const ALLOWED_TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Packed', 'Cancelled'],
  Packed: ['Shipped'],
  Shipped: ['Delivered'],

  Delivered: ['Reviewed'],
  Cancelled: [],
  Reviewed: [],
};

function pushTimeline(order, status, note) {
  const timeline = [
    ...(Array.isArray(order.timeline) ? order.timeline : []),
    { status, at: new Date().toISOString(), note },
  ];
  order.timeline = timeline;
  db.update('orders', order.id, { timeline });
  return timeline;
}

function assertUserOwns(reqUser, userId) {
  if (reqUser && reqUser.role !== 'admin' && reqUser.id !== undefined && Number(reqUser.id) !== Number(userId)) {
    throw new AppError(403, 'You can only manage your own data.');
  }
}

function enrichOrder(order, { includeCustomer = true } = {}) {
  const product = db.find('products', (p) => p.id === order.productId);
  const farmer = db.find('farmers', (f) => f.id === order.farmerId);
  const customer = includeCustomer ? db.find('customers', (c) => c.id === order.customerId) : null;
  return {
    ...order,
    cropName: product ? product.cropName : 'Unknown',
    photoUrl: product ? product.photoUrl : '',
    unit: product ? product.unit : 'kg',
    farmerName: farmer ? farmer.name : 'Unknown',
    farmerMobile: farmer ? farmer.mobile : '',
    customerName: customer ? customer.name : undefined,
    reviewed: order.status === 'Reviewed',
  };
}

function placeOrder({ customerId, productId, quantity, address, paymentMethod, idempotencyKey }) {
  // Validate the whole request before looking for a replay, so a malformed
  // retry can never borrow a previous order's result.
  const method = normalizePaymentMethod(paymentMethod);
  const qty = Number(quantity);
  if (!isPositiveNumber(qty)) throw new AppError(400, 'Quantity must be a positive number');

  const product = db.find('products', (p) => p.id === Number(productId));
  if (!product) throw new AppError(404, 'Product not found');
  if (product.approved !== true) throw new AppError(400, 'This product is not available for sale right now.');

  // A retried request returns the original order instead of duplicating it.
  // This runs before the stock check because the first attempt already took
  // the units — replaying must not fail just because the shelf is now empty.
  const replay = findByIdempotencyKey(idempotencyKey, { customerId, productId, quantity: qty });
  if (replay) return enrichOrder(replay);

  if (qty > product.quantity) {
    throw new AppError(400, `Requested quantity (${qty}) exceeds available stock (${product.quantity}).`);
  }

  const totalPrice = Math.round(qty * product.price * 100) / 100;

  // Rules that can reject the order are checked before anything is written, so
  // a refused COD request never reserves stock.
  if (method === 'cod') assertCodAllowed(totalPrice);

  const order = db.insert('orders', {
    customerId: Number(customerId),
    productId: product.id,
    farmerId: product.farmerId,
    quantity: qty,
    totalPrice,
    address: sanitizeText(address, 255) || 'Delivery address on file',
    orderDate: new Date().toISOString(),
    status: 'Pending',
    paymentMethod: method,
    // COD and freshly created Razorpay orders are both "pending" — an order is
    // only "paid" once money is actually confirmed (or collected on delivery).
    paymentStatus: 'pending',
    ...(idempotencyKey ? { idempotencyKey: String(idempotencyKey).slice(0, 80) } : {}),
    timeline: [],
  });
  pushTimeline(order, 'Pending', method === 'cod' ? 'Order placed — pay cash on delivery' : 'Order placed by customer');

  db.update('products', product.id, { quantity: Math.max(0, product.quantity - qty) });

  return enrichOrder(db.find('orders', (o) => o.id === order.id));
}

/**
 * Undo an order that was created for a payment that never started. The customer
 * never completed checkout, so the row is removed rather than left as a
 * Cancelled order in their history. Stock is released.
 */
function discardUnpaidOrder(orderId) {
  const order = db.find('orders', (o) => o.id === Number(orderId));
  if (!order) return null;
  if (order.paymentStatus === 'paid') {
    throw new AppError(400, 'A paid order cannot be discarded; cancel it instead.');
  }
  const product = db.find('products', (p) => p.id === order.productId);
  if (product) {
    db.update('products', product.id, { quantity: product.quantity + order.quantity });
  }
  db.remove('orders', order.id);
  return order;
}

function cancelOrder(orderId, note) {
  const order = db.find('orders', (o) => o.id === Number(orderId));
  if (!order) throw new AppError(404, 'Order not found');
  if (!CANCELLABLE.includes(order.status)) {
    throw new AppError(400, `Order cannot be cancelled once it is ${order.status}.`);
  }
  // A captured online payment cannot be undone by cancelling the order. Without
  // this guard the customer keeps their money, the units go back on the shelf and
  // the farmer has no order to fulfil, and there is no refund path in the app.
  if (order.paymentStatus === 'paid') {
    throw new AppError(400, 'This order has already been paid, so it cannot be cancelled. A refund is required.');
  }

  const updated = db.update('orders', order.id, { status: 'Cancelled' });
  pushTimeline(updated, 'Cancelled', note || 'Order cancelled before dispatch');

  const product = db.find('products', (p) => p.id === order.productId);
  if (product) {
    db.update('products', product.id, { quantity: product.quantity + order.quantity });
  }
  return enrichOrder(updated);
}

function updateStatus(orderId, status, note) {
  const order = db.find('orders', (o) => o.id === Number(orderId));
  if (!order) throw new AppError(404, 'Order not found');

  if (!(status in ALLOWED_TRANSITIONS)) {
    throw new AppError(400, `status must be one of: ${Object.keys(ALLOWED_TRANSITIONS).join(', ')}`);
  }
  if (status === 'Cancelled') {
    throw new AppError(400, 'Use the cancel-order action to cancel an order; stock is restored automatically.');
  }
  if (status === 'Reviewed') {
    throw new AppError(400, 'Orders are marked as Reviewed automatically after a customer review.');
  }
  if (!ALLOWED_TRANSITIONS[order.status].includes(status)) {
    throw new AppError(400, `Order cannot move from ${order.status} to ${status}.`);
  }

  let updated = db.update('orders', order.id, { status });

  // A Cash on Delivery order is settled the moment the goods reach the
  // customer. Online orders are already marked paid by gateway verification.
  if (status === 'Delivered' && updated.paymentMethod === 'cod' && updated.paymentStatus !== 'paid') {
    db.update('orders', order.id, {
      paymentStatus: 'paid',
      paidAt: new Date().toISOString(),
    });
    // Re-read so the response reflects the settlement, not the pre-update row.
    updated = db.find('orders', (o) => o.id === order.id);
  }

  pushTimeline(updated, status, note || `Marked as ${status}`);
  return enrichOrder(updated);
}

function reviewOrder(orderId, { customerId, rating, comment }) {
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
    throw new AppError(400, 'Rating must be a whole number between 1 and 5');
  }

  const order = db.find('orders', (o) => o.id === Number(orderId));
  if (!order) throw new AppError(404, 'Order not found');
  if (Number(customerId) !== order.customerId) {
    throw new AppError(403, 'only the customer who placed the order can review it');
  }
  if (order.status === 'Reviewed') {
    throw new AppError(400, 'This order has already been reviewed.');
  }
  if (order.status !== 'Delivered') {
    throw new AppError(400, 'You can only review an order after it has been delivered.');
  }

  const review = db.insert('reviews', {
    customerId: order.customerId,
    productId: order.productId,
    rating: Number(rating),
    comment: sanitizeText(comment, 300),
    createdAt: new Date().toISOString(),
  });

  const updated = db.update('orders', order.id, { status: 'Reviewed' });
  pushTimeline(updated, 'Reviewed', 'Customer submitted a review');

  return { review, order: updated };
}

function listForCustomer(customerId) {
  assertUserOwns(null, customerId);
  return db
    .filter('orders', (o) => o.customerId === Number(customerId))
    .map((o) => enrichOrder(o))
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
}

function listForFarmer(farmerId) {
  assertUserOwns(null, farmerId);
  return db
    .filter('orders', (o) => o.farmerId === Number(farmerId))
    .map((o) => enrichOrder(o, { includeCustomer: true }))
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
}

function listAll() {
  return db
    .all('orders')
    .map((o) => enrichOrder(o, { includeCustomer: true }))
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
}

module.exports = {
  STATUS_FLOW,
  ALLOWED_TRANSITIONS,
  PAYMENT_METHODS,
  placeOrder,
  cancelOrder,
  discardUnpaidOrder,
  updateStatus,
  reviewOrder,
  listForCustomer,
  listForFarmer,
  listAll,
  enrichOrder,
  assertUserOwns,
  normalizePaymentMethod,
  findByIdempotencyKey,
  assertCodAllowed,
};
