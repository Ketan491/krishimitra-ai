// Razorpay keys are set before requiring config so the service is exercised in
// "configured" mode without ever touching the network.
process.env.RAZORPAY_KEY_ID = 'rzp_test_1234567890';
process.env.RAZORPAY_KEY_SECRET = 'super_secret_for_unit_tests';
process.env.RAZORPAY_CURRENCY = 'INR';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { cleanupDb } = require('./lib');

require('./lib');

const db = require('../db');
const config = require('../config');
const paymentService = require('../services/paymentService');

let customer;
let product;

/** Stands in for the Razorpay HTTP client; records calls, never hits the network. */
function fakeGateway(amounts = {}) {
  const calls = { create: [], fetch: [] };
  return {
    calls,
    orders: {
      async create(payload) {
        calls.create.push(payload);
        return { id: 'order_gateway_generated', amount: payload.amount, currency: payload.currency };
      },
      async fetch(id) {
        calls.fetch.push(id);
        return { id, amount: amounts[id] };
      },
    },
  };
}

let gateway;

test.before(() => {
  db.all('orders').forEach((o) => db.remove('orders', o.id));
  db.all('products').forEach((p) => db.remove('products', p.id));

  customer = db.insert('customers', {
    name: 'Paying Customer',
    mobile: '9999900666',
    passwordHash: 'x',
    address: 'Test Street, Pune',
    addresses: [],
  });

  const farmer = db.insert('farmers', {
    name: 'Payment Farmer',
    mobile: '9999900555',
    passwordHash: 'x',
    location: 'Pune',
    soilType: 'loamy',
    landSize: 1,
  });

  product = db.insert('products', {
    farmerId: farmer.id,
    cropName: 'Onion',
    category: 'vegetable',
    price: 22,
    quantity: 200,
    unit: 'kg',
    approved: true,
    createdAt: new Date().toISOString(),
  });

  gateway = fakeGateway();
  paymentService.setGateway(gateway);
});

test.after(cleanupDb);

test('payments report as enabled when both keys are present', () => {
  assert.strictEqual(paymentService.isEnabled(), true);
  const pub = paymentService.publicConfig();
  assert.strictEqual(pub.enabled, true);
  assert.strictEqual(pub.keyId, config.razorpay.keyId);
  assert.strictEqual(pub.currency, 'INR');
});

test('publicConfig never leaks the key secret', () => {
  const serialized = JSON.stringify(paymentService.publicConfig());
  assert.ok(!serialized.includes(config.razorpay.keySecret));
});

test('expectedSignature matches the documented Razorpay HMAC', () => {
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update('order_ABC|pay_XYZ')
    .digest('hex');
  assert.strictEqual(paymentService.expectedSignature('order_ABC', 'pay_XYZ'), expected);
});

test('isValidSignature accepts a genuine signature and rejects tampering', () => {
  const signature = paymentService.expectedSignature('order_1', 'pay_1');
  assert.ok(paymentService.isValidSignature('order_1', 'pay_1', signature));
  assert.ok(!paymentService.isValidSignature('order_1', 'pay_2', signature), 'different payment id must fail');
  assert.ok(!paymentService.isValidSignature('order_2', 'pay_1', signature), 'different order id must fail');
  assert.ok(!paymentService.isValidSignature('order_1', 'pay_1', `${signature}x`), 'edited signature must fail');
  assert.ok(!paymentService.isValidSignature('order_1', 'pay_1', ''), 'missing signature must fail');
  assert.ok(!paymentService.isValidSignature('', 'pay_1', signature));
});

test('verifyPayment rejects a bad signature and marks the order failed', async () => {
  const order = db.insert('orders', {
    customerId: customer.id,
    productId: product.id,
    farmerId: 1,
    quantity: 2,
    totalPrice: 44,
    address: 'Test Street, Pune',
    orderDate: new Date().toISOString(),
    status: 'Pending',
    paymentStatus: 'pending',
    paymentMethod: 'razorpay',
    paymentStatus: 'pending',
    paymentProvider: 'razorpay',
    razorpayOrderId: 'order_bad_sig',
    timeline: [],
  });

  await assert.rejects(
    () =>
      paymentService.verifyPayment({
        orderId: order.id,
        customerId: customer.id,
        razorpayOrderId: 'order_bad_sig',
        razorpayPaymentId: 'pay_bad',
        razorpaySignature: 'deadbeef',
      }),
    (e) => e.status === 400 && /verification failed/i.test(e.message),
  );
  assert.strictEqual(db.find('orders', (o) => o.id === order.id).paymentStatus, 'failed');
  assert.strictEqual(gateway.calls.fetch.length, 0, 'a bad signature never reaches the gateway');
});

test('verifyPayment refuses to pay for somebody else’s order', async () => {
  const order = db.insert('orders', {
    customerId: customer.id,
    productId: product.id,
    farmerId: 1,
    quantity: 1,
    totalPrice: 22,
    address: 'Test Street, Pune',
    orderDate: new Date().toISOString(),
    status: 'Pending',
    paymentStatus: 'pending',
    paymentMethod: 'razorpay',
    paymentStatus: 'pending',
    razorpayOrderId: 'order_not_mine',
    timeline: [],
  });

  await assert.rejects(
    () =>
      paymentService.verifyPayment({
        orderId: order.id,
        customerId: customer.id + 999,
        razorpayOrderId: 'order_not_mine',
        razorpayPaymentId: 'pay_x',
        razorpaySignature: 'whatever',
      }),
    (e) => e.status === 403,
  );
});

test('verifyPayment refuses a payment id that does not belong to the order', async () => {
  const order = db.insert('orders', {
    customerId: customer.id,
    productId: product.id,
    farmerId: 1,
    quantity: 1,
    totalPrice: 22,
    address: 'Test Street, Pune',
    orderDate: new Date().toISOString(),
    status: 'Pending',
    paymentStatus: 'pending',
    paymentMethod: 'razorpay',
    paymentStatus: 'pending',
    razorpayOrderId: 'order_expected',
    timeline: [],
  });

  await assert.rejects(
    () =>
      paymentService.verifyPayment({
        orderId: order.id,
        customerId: customer.id,
        razorpayOrderId: 'order_someone_elses',
        razorpayPaymentId: 'pay_x',
        razorpaySignature: paymentService.expectedSignature('order_someone_elses', 'pay_x'),
      }),
    (e) => e.status === 400 && /does not belong/i.test(e.message),
  );
});

test('verifyPayment marks a valid payment paid and is idempotent', async () => {
  const order = db.insert('orders', {
    customerId: customer.id,
    productId: product.id,
    farmerId: 1,
    quantity: 3,
    totalPrice: 66,
    address: 'Test Street, Pune',
    orderDate: new Date().toISOString(),
    status: 'Pending',
    paymentStatus: 'pending',
    paymentMethod: 'razorpay',
    paymentStatus: 'pending',
    paymentProvider: 'razorpay',
    razorpayOrderId: 'order_good',
    timeline: [],
  });

  const razorpayOrderId = 'order_good';
  const razorpayPaymentId = 'pay_good';
  const razorpaySignature = paymentService.expectedSignature(razorpayOrderId, razorpayPaymentId);

  // Gateway reports the same amount we asked for.
  paymentService.setGateway(fakeGateway({ order_good: 6600 }));

  const first = await paymentService.verifyPayment({
    orderId: order.id,
    customerId: customer.id,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  assert.strictEqual(first.success, true);
  assert.strictEqual(first.order.paymentStatus, 'paid');
  assert.strictEqual(first.order.razorpayPaymentId, razorpayPaymentId);
  assert.ok(first.order.paidAt, 'paidAt is stamped');
  assert.strictEqual(first.order.status, 'Pending', 'order status is separate from payment status');

  // Retrying the same callback must not fail or double-apply.
  const second = await paymentService.verifyPayment({
    orderId: order.id,
    customerId: customer.id,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });
  assert.strictEqual(second.success, true);
  assert.strictEqual(second.alreadyProcessed, true);
});

test('a signature-valid payment for the wrong amount is rejected', async () => {
  const order = db.insert('orders', {
    customerId: customer.id,
    productId: product.id,
    farmerId: 1,
    quantity: 1,
    totalPrice: 22,
    address: 'Test Street, Pune',
    orderDate: new Date().toISOString(),
    status: 'Pending',
    paymentStatus: 'pending',
    paymentMethod: 'razorpay',
    paymentStatus: 'pending',
    paymentProvider: 'razorpay',
    razorpayOrderId: 'order_wrong_amount',
    timeline: [],
  });

  // Gateway says ₹1.00 was collected while the order is ₹22.00.
  paymentService.setGateway(fakeGateway({ order_wrong_amount: 100 }));

  await assert.rejects(
    () =>
      paymentService.verifyPayment({
        orderId: order.id,
        customerId: customer.id,
        razorpayOrderId: 'order_wrong_amount',
        razorpayPaymentId: 'pay_wrong_amount',
        razorpaySignature: paymentService.expectedSignature('order_wrong_amount', 'pay_wrong_amount'),
      }),
    (e) => e.status === 400 && /amount does not match/i.test(e.message),
  );
  assert.strictEqual(db.find('orders', (o) => o.id === order.id).paymentStatus, 'pending');
});

test('createOrder prices the payment from the stored product, ignoring any client amount', async () => {
  const localGateway = fakeGateway();
  paymentService.setGateway(localGateway);

  const result = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: product.id,
    quantity: 4,
    address: 'Test Street, Pune',
    // A hostile client would like to pay ₹1.
    amount: 1,
    total: 1,
  });

  assert.strictEqual(result.amount, 88, '4 x ₹22 computed on the server');
  assert.strictEqual(result.amountInPaise, 8800);
  assert.strictEqual(result.currency, 'INR');
  assert.strictEqual(result.keyId, config.razorpay.keyId);
  assert.ok(result.razorpayOrderId);
  assert.strictEqual(result.order.paymentStatus, 'pending');
  assert.strictEqual(result.order.razorpayOrderId, result.razorpayOrderId);

  assert.strictEqual(localGateway.calls.create.length, 1);
  assert.strictEqual(localGateway.calls.create[0].amount, 8800, 'gateway is asked for the server amount');
  assert.strictEqual(localGateway.calls.create[0].receipt, `km_order_${result.order.id}`);

  // Stock is held for the pending order.
  assert.strictEqual(db.find('products', (p) => p.id === product.id).quantity, 196);
});

test('a cancelled order cannot be paid', async () => {
  const order = db.insert('orders', {
    customerId: customer.id,
    productId: product.id,
    farmerId: 1,
    quantity: 1,
    totalPrice: 22,
    address: 'Test Street, Pune',
    orderDate: new Date().toISOString(),
    status: 'Cancelled',
    paymentStatus: 'pending',
    paymentMethod: 'razorpay',
    paymentStatus: 'pending',
    razorpayOrderId: 'order_cancelled',
    timeline: [],
  });

  await assert.rejects(
    () =>
      paymentService.verifyPayment({
        orderId: order.id,
        customerId: customer.id,
        razorpayOrderId: 'order_cancelled',
        razorpayPaymentId: 'pay_cancelled',
        razorpaySignature: paymentService.expectedSignature('order_cancelled', 'pay_cancelled'),
      }),
    (e) => e.status === 400 && /cancelled/i.test(e.message),
  );
});

test('createOrder rolls the order back when the gateway call fails', async () => {
  const stockBefore = db.find('products', (p) => p.id === product.id).quantity;
  const ordersBefore = db.all('orders').length;

  paymentService.setGateway({
    orders: {
      create: async () => {
        throw new Error('gateway down');
      },
    },
  });

  await assert.rejects(
    () =>
      paymentService.createOrder({
        customerId: customer.id,
        customer,
        productId: product.id,
        quantity: 5,
        address: 'Test Street, Pune',
      }),
    (e) => e.status === 502,
  );

  assert.strictEqual(db.all('orders').length, ordersBefore, 'no orphan order is left behind');
  assert.strictEqual(
    db.find('products', (p) => p.id === product.id).quantity,
    stockBefore,
    'stock is released when the gateway call fails',
  );
});

test('cancelUnpaidOrder releases the stock held by an abandoned checkout', () => {
  const stockBefore = db.find('products', (p) => p.id === product.id).quantity;
  const order = db.insert('orders', {
    customerId: customer.id,
    productId: product.id,
    farmerId: 1,
    quantity: 7,
    totalPrice: 154,
    address: 'Test Street, Pune',
    orderDate: new Date().toISOString(),
    status: 'Pending',
    paymentStatus: 'pending',
    paymentMethod: 'razorpay',
    paymentStatus: 'pending',
    paymentProvider: 'razorpay',
    razorpayOrderId: 'order_abandoned',
    timeline: [],
  });
  db.update('products', product.id, { quantity: stockBefore - 7 });

  const result = paymentService.cancelUnpaidOrder({ orderId: order.id, customerId: customer.id });

  assert.strictEqual(result.success, true);
  assert.strictEqual(db.find('orders', (o) => o.id === order.id), undefined, 'the order row is removed');
  assert.strictEqual(
    db.find('products', (p) => p.id === product.id).quantity,
    stockBefore,
    'held stock goes back to the farmer',
  );
});

test('cancelUnpaidOrder will not touch an order belonging to somebody else', () => {
  const order = db.insert('orders', {
    customerId: customer.id,
    productId: product.id,
    farmerId: 1,
    quantity: 1,
    totalPrice: 22,
    address: 'Test Street, Pune',
    orderDate: new Date().toISOString(),
    status: 'Pending',
    paymentStatus: 'pending',
    paymentMethod: 'razorpay',
    paymentStatus: 'pending',
    razorpayOrderId: 'order_stranger',
    timeline: [],
  });

  assert.throws(
    () => paymentService.cancelUnpaidOrder({ orderId: order.id, customerId: customer.id + 999 }),
    (e) => e.status === 403,
  );
  assert.ok(db.find('orders', (o) => o.id === order.id), 'the order survives');
});

test('cancelUnpaidOrder refuses to discard a paid order', () => {
  const order = db.insert('orders', {
    customerId: customer.id,
    productId: product.id,
    farmerId: 1,
    quantity: 1,
    totalPrice: 22,
    address: 'Test Street, Pune',
    orderDate: new Date().toISOString(),
    status: 'Pending',
    paymentStatus: 'paid',
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    razorpayOrderId: 'order_paid_cancel',
    razorpayPaymentId: 'pay_1',
    timeline: [],
  });

  assert.throws(
    () => paymentService.cancelUnpaidOrder({ orderId: order.id, customerId: customer.id }),
    (e) => e.status === 400 && /already paid/i.test(e.message),
  );
  assert.ok(db.find('orders', (o) => o.id === order.id), 'a paid order is never silently dropped');
});

test('a paid order cannot be paid again with a different payment id', async () => {
  const order = db.insert('orders', {
    customerId: customer.id,
    productId: product.id,
    farmerId: 1,
    quantity: 1,
    totalPrice: 22,
    address: 'Test Street, Pune',
    orderDate: new Date().toISOString(),
    status: 'Pending',
    paymentStatus: 'paid',
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    paymentProvider: 'razorpay',
    razorpayOrderId: 'order_paid',
    razorpayPaymentId: 'pay_original',
    paidAt: new Date().toISOString(),
    timeline: [],
  });

  await assert.rejects(
    () =>
      paymentService.verifyPayment({
        orderId: order.id,
        customerId: customer.id,
        razorpayOrderId: 'order_paid',
        razorpayPaymentId: 'pay_different',
        razorpaySignature: paymentService.expectedSignature('order_paid', 'pay_different'),
      }),
    (e) => e.status === 409,
  );
});
