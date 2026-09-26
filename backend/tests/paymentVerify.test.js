/**
 * The signature-verification happy path.
 *
 * Every other payment test exercises a *forged* callback or a COD settlement,
 * which left the single most security-critical assertion - "a correctly signed
 * callback marks the order paid" - unproven. A regression here is the worst
 * possible failure for a shop: the customer is charged and the order never
 * confirms.
 */
process.env.RAZORPAY_KEY_ID = 'rzp_test_1234567890';
process.env.RAZORPAY_KEY_SECRET = 'super_secret_for_unit_tests';
process.env.RAZORPAY_CURRENCY = 'INR';
process.env.COD_ENABLED = 'true';
process.env.COD_MAX_AMOUNT = '1000';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { cleanupDb } = require('./lib');

require('./lib');

const db = require('../db');
const config = require('../config');
const paymentService = require('../services/paymentService');

const HASH = 'verify_hash';

function fakeGateway(amounts = {}) {
  const calls = { create: [], fetch: [] };
  return {
    calls,
    orders: {
      async create(payload) {
        calls.create.push(payload);
        return { id: `order_gw_${calls.create.length}`, amount: payload.amount, currency: payload.currency };
      },
      async fetch(id) {
        calls.fetch.push(id);
        if (amounts[id] === undefined) throw new Error('no such gateway order');
        return { id, amount: amounts[id] };
      },
    },
  };
}

function sign(orderId, paymentId, secret = config.razorpay.keySecret) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

let customer;
let farmer;
let product;

test.before(() => {
  db.all('orders').forEach((o) => db.remove('orders', o.id));
  db.all('products').forEach((p) => db.remove('products', p.id));

  customer = db.insert('customers', {
    name: 'Verify Customer',
    mobile: '9887711223',
    passwordHash: HASH,
    address: 'Verify Street, Pune',
    addresses: [{ id: 1, label: 'Home', fullAddress: 'Verify Street, Pune', isDefault: true }],
  });

  farmer = db.insert('farmers', {
    name: 'Verify Farmer',
    mobile: '9887711333',
    passwordHash: HASH,
    location: 'Pune',
    soilType: 'loamy',
    landSize: 1,
  });

  product = db.insert('products', {
    cropName: 'Signature Test Crop',
    category: 'vegetable',
    price: 40,
    compareToPrice: 50,
    quantity: 1000,
    unit: 'kg',
    photoUrl: '/products/verify.jpg',
    approved: true,
    farmerId: farmer.id,
    farmerName: farmer.name,
    location: 'Pune',
    description: 'Used to verify signature handling.',
    createdAt: new Date().toISOString(),
  });
});

test.after(cleanupDb);

/** Creates a real online order through the service and returns it with its ids. */
async function onlineOrder(gateway) {
  paymentService.setGateway(gateway);
  const res = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: product.id,
    quantity: 2,
    address: 'Verify Street, Pune',
    paymentMethod: 'razorpay',
  });
  return res;
}

test('a correctly signed callback marks the order paid and keeps the stock held', async () => {
  const gateway = fakeGateway();
  const created = await onlineOrder(gateway);

  const gatewayOrderId = created.order.razorpayOrderId;
  const paymentId = 'pay_ok_1';
  // Razorpay collected exactly what we asked for.
  gateway.orders.fetch = async (id) => ({ id, amount: 8000 });

  const stockBefore = db.find('products', (p) => p.id === product.id).quantity;

  const res = await paymentService.verifyPayment({
    orderId: created.order.id,
    customerId: customer.id,
    razorpayOrderId: gatewayOrderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: sign(gatewayOrderId, paymentId),
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.order.paymentStatus, 'paid');
  assert.strictEqual(res.order.razorpayPaymentId, paymentId);
  assert.ok(res.order.paidAt, 'paidAt must be stamped');

  const stored = db.find('orders', (o) => o.id === created.order.id);
  assert.strictEqual(stored.paymentStatus, 'paid');
  // A paid order must never have its stock released.
  assert.strictEqual(db.find('products', (p) => p.id === product.id).quantity, stockBefore);
});

test('re-verifying the same payment is idempotent, not an error', async () => {
  const gateway = fakeGateway();
  const created = await onlineOrder(gateway);
  const gatewayOrderId = created.order.razorpayOrderId;
  const paymentId = 'pay_idem_1';
  gateway.orders.fetch = async (id) => ({ id, amount: 8000 });

  const args = {
    orderId: created.order.id,
    customerId: customer.id,
    razorpayOrderId: gatewayOrderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: sign(gatewayOrderId, paymentId),
  };
  await paymentService.verifyPayment(args);
  const again = await paymentService.verifyPayment(args);

  assert.strictEqual(again.success, true);
  assert.strictEqual(again.alreadyProcessed, true);
  // The original paidAt must survive the second call.
  const first = db.find('orders', (o) => o.id === created.order.id);
  assert.strictEqual(again.order.paidAt, first.paidAt);
});

test('a signature made with the wrong secret is rejected and flagged failed', async () => {
  const gateway = fakeGateway();
  const created = await onlineOrder(gateway);
  const gatewayOrderId = created.order.razorpayOrderId;
  gateway.orders.fetch = async (id) => ({ id, amount: 8000 });

  await assert.rejects(
    paymentService.verifyPayment({
      orderId: created.order.id,
      customerId: customer.id,
      razorpayOrderId: gatewayOrderId,
      razorpayPaymentId: 'pay_forged_1',
      razorpaySignature: sign(gatewayOrderId, 'pay_forged_1', 'attacker_secret'),
    }),
    /verification failed/i,
  );

  const stored = db.find('orders', (o) => o.id === created.order.id);
  assert.strictEqual(stored.paymentStatus, 'failed');
  assert.ok(!stored.paidAt);
});

test('a valid signature for a different payment id does not settle the order', async () => {
  const gateway = fakeGateway();
  const created = await onlineOrder(gateway);
  const gatewayOrderId = created.order.razorpayOrderId;
  gateway.orders.fetch = async (id) => ({ id, amount: 8000 });

  // Correct HMAC, but over a payment id the attacker substitutes: swapping the
  // id must invalidate the signature.
  await assert.rejects(
    paymentService.verifyPayment({
      orderId: created.order.id,
      customerId: customer.id,
      razorpayOrderId: gatewayOrderId,
      razorpayPaymentId: 'pay_swapped',
      razorpaySignature: sign(gatewayOrderId, 'pay_original'),
    }),
    /verification failed/i,
  );
  assert.strictEqual(db.find('orders', (o) => o.id === created.order.id).paymentStatus, 'failed');
});

test('a real signature is refused when Razorpay collected a different amount', async () => {
  const gateway = fakeGateway();
  const created = await onlineOrder(gateway);
  const gatewayOrderId = created.order.razorpayOrderId;
  const paymentId = 'pay_short_1';
  // Genuine signature, but the gateway only collected half of the order total.
  gateway.orders.fetch = async (id) => ({ id, amount: 4000 });

  await assert.rejects(
    paymentService.verifyPayment({
      orderId: created.order.id,
      customerId: customer.id,
      razorpayOrderId: gatewayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: sign(gatewayOrderId, paymentId),
    }),
    /amount does not match/i,
  );

  const stored = db.find('orders', (o) => o.id === created.order.id);
  assert.notStrictEqual(stored.paymentStatus, 'paid');
});

test('another customer cannot verify this order', async () => {
  const gateway = fakeGateway();
  const created = await onlineOrder(gateway);
  const gatewayOrderId = created.order.razorpayOrderId;
  const paymentId = 'pay_x1';
  gateway.orders.fetch = async (id) => ({ id, amount: 8000 });

  await assert.rejects(
    paymentService.verifyPayment({
      orderId: created.order.id,
      customerId: customer.id + 999,
      razorpayOrderId: gatewayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: sign(gatewayOrderId, paymentId),
    }),
  );
  assert.notStrictEqual(db.find('orders', (o) => o.id === created.order.id).paymentStatus, 'paid');
});

test('an unreadable gateway order still settles on a valid signature', async () => {
  // The signature is proof enough; a transient gateway read failure must not
  // leave a genuinely paid order stuck as unpaid.
  const gateway = fakeGateway();
  const created = await onlineOrder(gateway);
  const gatewayOrderId = created.order.razorpayOrderId;
  const paymentId = 'pay_gw_down';
  // fetch() throws by default in this fake.

  const res = await paymentService.verifyPayment({
    orderId: created.order.id,
    customerId: customer.id,
    razorpayOrderId: gatewayOrderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: sign(gatewayOrderId, paymentId),
  });
  assert.strictEqual(res.order.paymentStatus, 'paid');
});
