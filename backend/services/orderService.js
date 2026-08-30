const db = require('../db');
const { AppError } = require('../middleware/errors');
const { isPositiveNumber, sanitizeText } = require('../utils/validators');

const STATUS_FLOW = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Reviewed'];
const CANCELLABLE = ['Pending', 'Confirmed'];

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

function placeOrder({ customerId, productId, quantity, address }) {
  const qty = Number(quantity);
  if (!isPositiveNumber(qty)) throw new AppError(400, 'Quantity must be a positive number');

  const product = db.find('products', (p) => p.id === Number(productId));
  if (!product) throw new AppError(404, 'Product not found');
  if (product.approved !== true) throw new AppError(400, 'This product is not available for sale right now.');
  if (qty > product.quantity) {
    throw new AppError(400, `Requested quantity (${qty}) exceeds available stock (${product.quantity}).`);
  }

  const totalPrice = Math.round(qty * product.price * 100) / 100;
  const order = db.insert('orders', {
    customerId: Number(customerId),
    productId: product.id,
    farmerId: product.farmerId,
    quantity: qty,
    totalPrice,
    address: sanitizeText(address, 255) || 'Delivery address on file',
    orderDate: new Date().toISOString(),
    status: 'Pending',
    timeline: [],
  });
  pushTimeline(order, 'Pending', 'Order placed by customer');

  db.update('products', product.id, { quantity: Math.max(0, product.quantity - qty) });

  return enrichOrder(db.find('orders', (o) => o.id === order.id));
}

function cancelOrder(orderId, note) {
  const order = db.find('orders', (o) => o.id === Number(orderId));
  if (!order) throw new AppError(404, 'Order not found');
  if (!CANCELLABLE.includes(order.status)) {
    throw new AppError(400, `Order cannot be cancelled once it is ${order.status}.`);
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

  const updated = db.update('orders', order.id, { status });
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
  placeOrder,
  cancelOrder,
  updateStatus,
  reviewOrder,
  listForCustomer,
  listForFarmer,
  listAll,
  enrichOrder,
  assertUserOwns,
};
