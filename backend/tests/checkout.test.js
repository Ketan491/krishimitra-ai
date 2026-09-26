// Razorpay keys are set before requiring config so both payment methods can be
// exercised offline: `razorpay` against an injected gateway, `cod` with no
// gateway at all.
process.env.RAZORPAY_KEY_ID = 'rzp_test_1234567890';
process.env.RAZORPAY_KEY_SECRET = 'super_secret_for_unit_tests';
process.env.RAZORPAY_CURRENCY = 'INR';
process.env.COD_ENABLED = 'true';
process.env.COD_MAX_AMOUNT = '1000';

const test = require('node:test');
const assert = require('node:assert');
const { cleanupDb } = require('./lib');

require('./lib');

const db = require('../db');
const config = require('../config');
const paymentService = require('../services/paymentService');
const orderService = require('../services/orderService');

let customer;
let cheapProduct; // ₹20/kg
let priceyProduct; // ₹900/kg — used to exceed the COD cap
let farmer;

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
        return { id, amount: amounts[id] };
      },
    },
  };
}

test.before(() => {
  db.all('orders').forEach((o) => db.remove('orders', o.id));
  db.all('products').forEach((p) => db.remove('products', p.id));

  customer = db.insert('customers', {
    name: 'COD Customer',
    mobile: '9999900444',
    passwordHash: 'x',
    address: 'Test Street, Pune',
    addresses: [],
  });

  farmer = db.insert('farmers', {
    name: 'Checkout Farmer',
    mobile: '9999900333',
    passwordHash: 'x',
    location: 'Pune',
    soilType: 'loamy',
    landSize: 1,
  });

  const base = {
    farmerId: farmer.id,
    category: 'vegetable',
    unit: 'kg',
    approved: true,
    createdAt: new Date().toISOString(),
  };
  cheapProduct = db.insert('products', { ...base, cropName: 'Onion', price: 20, quantity: 300 });
  priceyProduct = db.insert('products', { ...base, cropName: 'Saffron', price: 900, quantity: 40 });
});

test.after(cleanupDb);

test('the public config advertises COD rules without leaking secrets', () => {
  const pub = paymentService.publicConfig();
  assert.strictEqual(pub.enabled, true);
  assert.strictEqual(pub.codEnabled, true);
  assert.strictEqual(pub.codMaxAmount, 1000);
  assert.ok(!JSON.stringify(pub).includes(config.razorpay.keySecret));
});

test('availableMethods offers online plus COD below the cap', () => {
  assert.deepStrictEqual(paymentService.availableMethods(500), ['razorpay', 'cod']);
  assert.deepStrictEqual(paymentService.availableMethods(5000), ['razorpay'], 'COD is withheld above the cap');
});

// ---------------------------------------------------------------- COD flow

test('a COD order is recorded as pending and unpaid, with no gateway call', async () => {
  const gateway = fakeGateway();
  paymentService.setGateway(gateway);

  const stockBefore = db.find('products', (p) => p.id === cheapProduct.id).quantity;
  const res = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: cheapProduct.id,
    quantity: 2,
    address: 'Test Street, Pune',
    paymentMethod: 'cod',
  });

  assert.strictEqual(res.paymentMethod, 'cod');
  assert.strictEqual(res.amount, 40);
  assert.strictEqual(res.razorpayOrderId, undefined, 'COD never gets a Razorpay order');
  assert.strictEqual(res.order.paymentStatus, 'pending', 'COD starts unpaid');
  assert.strictEqual(res.order.paymentMethod, 'cod');
  assert.strictEqual(res.order.status, 'Pending');
  assert.strictEqual(gateway.calls.create.length, 0, 'no gateway traffic for COD');
  assert.strictEqual(
    db.find('products', (p) => p.id === cheapProduct.id).quantity,
    stockBefore - 2,
    'stock is reserved for the COD order',
  );
});

test('COD above the configured cap is refused', async () => {
  // 2 x ₹900 = ₹1800, over the ₹1000 cap.
  await assert.rejects(
    () =>
      paymentService.createOrder({
        customerId: customer.id,
        customer,
        productId: priceyProduct.id,
        quantity: 2,
        address: 'Test Street, Pune',
        paymentMethod: 'cod',
      }),
    (e) => e.status === 400 && /Cash on Delivery is only available up to/.test(e.message),
  );
});

test('COD refuses to over-order and never takes stock below zero', async () => {
  const before = db.find('products', (p) => p.id === priceyProduct.id).quantity;
  await assert.rejects(
    () =>
      paymentService.createOrder({
        customerId: customer.id,
        customer,
        productId: priceyProduct.id,
        quantity: before + 5,
        address: 'Test Street, Pune',
        paymentMethod: 'cod',
      }),
    (e) => e.status === 400 && /exceeds available stock/.test(e.message),
  );
  assert.strictEqual(db.find('products', (p) => p.id === priceyProduct.id).quantity, before);
});

test('an unknown payment method is rejected', async () => {
  await assert.rejects(
    () =>
      paymentService.createOrder({
        customerId: customer.id,
        customer,
        productId: cheapProduct.id,
        quantity: 1,
        address: 'Test Street, Pune',
        paymentMethod: 'paypal',
      }),
    (e) => e.status === 400 && /paymentMethod must be one of/.test(e.message),
  );
});

test('a COD order can never be flipped to paid by a gateway callback', async () => {
  const cod = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: cheapProduct.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'cod',
  });

  await assert.rejects(
    () =>
      paymentService.verifyPayment({
        orderId: cod.order.id,
        customerId: customer.id,
        razorpayOrderId: 'order_forged',
        razorpayPaymentId: 'pay_forged',
        razorpaySignature: paymentService.expectedSignature('order_forged', 'pay_forged'),
      }),
    (e) => e.status === 400 && /Cash on Delivery/.test(e.message),
  );
  assert.strictEqual(db.find('orders', (o) => o.id === cod.order.id).paymentStatus, 'pending');
});

test('a COD order is never discarded as an abandoned payment', () => {
  const cod = db.all('orders').find((o) => o.paymentMethod === 'cod');
  assert.throws(
    () => paymentService.cancelUnpaidOrder({ orderId: cod.id, customerId: customer.id }),
    (e) => e.status === 400 && /My Orders/.test(e.message),
  );
  assert.ok(db.find('orders', (o) => o.id === cod.id), 'the COD order survives');
});

// ------------------------------------------------- duplicate order protection

test('the same idempotency key returns one order instead of two', async () => {
  const stockBefore = db.find('products', (p) => p.id === cheapProduct.id).quantity;
  const key = 'dup-key-cod-1';

  const first = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: cheapProduct.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'cod',
    idempotencyKey: key,
  });
  const second = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: cheapProduct.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'cod',
    idempotencyKey: key,
  });

  assert.strictEqual(second.order.id, first.order.id, 'retry resolves to the original order');
  assert.strictEqual(
    db.find('products', (p) => p.id === cheapProduct.id).quantity,
    stockBefore - 1,
    'stock is only reserved once',
  );
});

test('a stale idempotency key does not block a genuinely new order', async () => {
  const key = 'dup-key-stale';
  const first = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: cheapProduct.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'cod',
    idempotencyKey: key,
  });

  // Backdate the order so the key falls outside the dedupe window.
  db.update('orders', first.order.id, { orderDate: new Date(Date.now() - 60 * 60 * 1000).toISOString() });

  const later = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: cheapProduct.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'cod',
    idempotencyKey: key,
  });
  assert.notStrictEqual(later.order.id, first.order.id);
});

test('retried online checkout with the same key reuses the order', async () => {
  const gateway = fakeGateway();
  paymentService.setGateway(gateway);
  const key = 'dup-key-online-1';

  const first = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: cheapProduct.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'razorpay',
    idempotencyKey: key,
  });
  const second = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: cheapProduct.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'razorpay',
    idempotencyKey: key,
  });

  assert.strictEqual(second.order.id, first.order.id);
  assert.strictEqual(gateway.calls.create.length, 1, 'the gateway is only called once');
});

// ------------------------------------------------------------ legacy orders

test('orders created before payment fields existed are read as COD/unpaid', () => {
  const legacy = db.insert('orders', {
    customerId: customer.id,
    productId: cheapProduct.id,
    farmerId: farmer.id,
    quantity: 1,
    totalPrice: 20,
    address: 'Legacy Lane',
    orderDate: new Date().toISOString(),
    status: 'Pending',
    timeline: [],
  });

  const healed = db.find('orders', (o) => o.id === legacy.id);
  assert.strictEqual(healed.paymentMethod, 'cod');
  assert.strictEqual(healed.paymentStatus, 'pending');
});

test('the plain order route settles offline and is stored as COD', () => {
  const order = orderService.placeOrder({
    customerId: customer.id,
    productId: cheapProduct.id,
    quantity: 1,
    address: 'Test Street, Pune',
  });
  assert.strictEqual(order.paymentMethod, 'cod');
  assert.strictEqual(order.paymentStatus, 'pending');
});

test('a refused COD order leaves stock completely untouched', () => {
  const before = db.find('products', (p) => p.id === priceyProduct.id).quantity;
  const countBefore = db.all('orders').length;
  assert.throws(
    () =>
      orderService.placeOrder({
        customerId: customer.id,
        productId: priceyProduct.id,
        quantity: 2, // ₹1800, over the cap
        address: 'Test Street, Pune',
        paymentMethod: 'cod',
      }),
    (e) => e.status === 400,
  );
  assert.strictEqual(db.find('products', (p) => p.id === priceyProduct.id).quantity, before, 'stock not held');
  assert.strictEqual(db.all('orders').length, countBefore, 'no orphan order row');
});

test('COD stays unavailable when the feature is switched off', () => {
  const original = config.cod.enabled;
  config.cod.enabled = false;
  try {
    assert.throws(
      () =>
        orderService.placeOrder({
          customerId: customer.id,
          productId: cheapProduct.id,
          quantity: 1,
          address: 'Test Street, Pune',
          paymentMethod: 'cod',
        }),
      (e) => e.status === 400 && /unavailable/.test(e.message),
    );
  } finally {
    config.cod.enabled = original;
  }
});

test('one customer cannot replay another customer order with a stolen key', async () => {
  const thief = db.insert('customers', {
    name: 'Other Customer',
    mobile: '9999900555',
    passwordHash: 'x',
    address: 'Elsewhere',
    addresses: [],
  });

  const victimOrder = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: cheapProduct.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'cod',
    idempotencyKey: 'shared-key-1',
  });

  await assert.rejects(
    () =>
      paymentService.createOrder({
        customerId: thief.id,
        customer: thief,
        productId: cheapProduct.id,
        quantity: 1,
        address: 'Elsewhere',
        paymentMethod: 'cod',
        idempotencyKey: 'shared-key-1',
      }),
    (e) => e.status === 409,
    'a colliding key must not hand over somebody else\'s order',
  );
  assert.ok(victimOrder.order.id);
});

test('reusing a key for a different basket is refused', async () => {
  const key = 'reused-key-1';
  await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: cheapProduct.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'cod',
    idempotencyKey: key,
  });

  await assert.rejects(
    () =>
      paymentService.createOrder({
        customerId: customer.id,
        customer,
        productId: cheapProduct.id,
        quantity: 3, // different quantity under the same key
        address: 'Test Street, Pune',
        paymentMethod: 'cod',
        idempotencyKey: key,
      }),
    (e) => e.status === 409,
  );
});

test('a retry still succeeds after selling the very last unit', async () => {
  const scarce = db.insert('products', {
    farmerId: farmer.id,
    category: 'vegetable',
    cropName: 'Last Radish',
    price: 10,
    quantity: 1,
    unit: 'kg',
    approved: true,
    createdAt: new Date().toISOString(),
  });
  const key = 'last-unit-key';

  const first = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: scarce.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'cod',
    idempotencyKey: key,
  });
  const retry = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: scarce.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'cod',
    idempotencyKey: key,
  });

  assert.strictEqual(retry.order.id, first.order.id);
  assert.strictEqual(db.find('products', (p) => p.id === scarce.id).quantity, 0, 'stock only taken once');
});

test('a COD order becomes paid when the farmer marks it delivered', async () => {
  const cod = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: cheapProduct.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'cod',
  });
  assert.strictEqual(cod.order.paymentStatus, 'pending');

  orderService.updateStatus(cod.order.id, 'Confirmed');
  orderService.updateStatus(cod.order.id, 'Packed');
  orderService.updateStatus(cod.order.id, 'Shipped');
  const delivered = orderService.updateStatus(cod.order.id, 'Delivered');

  assert.strictEqual(delivered.status, 'Delivered');
  assert.strictEqual(delivered.paymentStatus, 'paid', 'cash collected on delivery');
  assert.ok(delivered.paidAt, 'settlement is timestamped');
});

test('a cancelled COD order is never marked paid', async () => {
  const cod = await paymentService.createOrder({
    customerId: customer.id,
    customer,
    productId: cheapProduct.id,
    quantity: 1,
    address: 'Test Street, Pune',
    paymentMethod: 'cod',
  });
  const cancelled = orderService.cancelOrder(cod.order.id, 'Customer changed their mind');
  assert.strictEqual(cancelled.status, 'Cancelled');
  assert.notStrictEqual(cancelled.paymentStatus, 'paid');
});
