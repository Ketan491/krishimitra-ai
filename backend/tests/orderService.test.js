const test = require('node:test');
const assert = require('node:assert');
const { cleanupDb } = require('./lib');

require('./lib');

const db = require('../db');
const orderService = require('../services/orderService');

test.before(() => {
  const farmer = db.insert('farmers', {
    name: 'Fixture Farmer',
    mobile: '9999900001',
    passwordHash: 'x',
    location: 'Pune',
    soilType: 'loamy',
    landSize: 2,
  });
  const customer = db.insert('customers', {
    name: 'Fixture Customer',
    mobile: '9999900002',
    passwordHash: 'x',
  });
  const product = db.insert('products', {
    farmerId: farmer.id,
    cropName: 'FixedCrop',
    price: 10,
    quantity: 20,
    unit: 'kg',
    approved: true,
  });
  global.__fx = { farmer, customer, product };
});

test.after(cleanupDb);

test('placeOrder reduces product stock by the ordered quantity', () => {
  const { customer, product } = global.__fx;
  const order = orderService.placeOrder({ customerId: customer.id, productId: product.id, quantity: 3 });
  assert.strictEqual(order.status, 'Pending');
  assert.strictEqual(order.totalPrice, 30);
  assert.ok(order.timeline.at(-1).status === 'Pending');

  const fresh = db.find('products', (p) => p.id === product.id);
  assert.strictEqual(fresh.quantity, 17);
});

test('placeOrder rejects orders exceeding available stock', () => {
  const { customer, product } = global.__fx;
  assert.throws(
    () => orderService.placeOrder({ customerId: customer.id, productId: product.id, quantity: 999 }),
    (e) => e.status === 400 && /available stock/i.test(e.message),
  );
});

test('placing an order for an unapproved product is blocked', () => {
  const { customer } = global.__fx;
  const hide = db.insert('products', {
    farmerId: global.__fx.farmer.id,
    cropName: 'HiddenCrop',
    price: 5,
    quantity: 50,
    unit: 'kg',
    approved: null,
  });
  assert.throws(
    () => orderService.placeOrder({ customerId: customer.id, productId: hide.id, quantity: 1 }),
    /not available for sale/,
  );
});

test('cancelling a pending order restores reserved stock', () => {
  const { customer, product } = global.__fx;
  const order = orderService.placeOrder({ customerId: customer.id, productId: product.id, quantity: 5 });
  const before = db.find('products', (p) => p.id === product.id).quantity;

  const cancelled = orderService.cancelOrder(order.id, 'changed my mind');
  assert.strictEqual(cancelled.status, 'Cancelled');

  const after = db.find('products', (p) => p.id === product.id).quantity;
  assert.strictEqual(after, before + 5, 'stock should be restored on cancel');
});

test('shipped/delivered orders cannot be cancelled', () => {
  const { customer, product } = global.__fx;
  const order = orderService.placeOrder({ customerId: customer.id, productId: product.id, quantity: 1 });
  orderService.updateStatus(order.id, 'Confirmed');
  orderService.updateStatus(order.id, 'Packed');
  orderService.updateStatus(order.id, 'Shipped');
  assert.throws(() => orderService.cancelOrder(order.id), /cannot be cancelled/);
});

test('status transitions follow the allowed lifecycle', () => {
  const { customer, product } = global.__fx;
  const order = orderService.placeOrder({ customerId: customer.id, productId: product.id, quantity: 1 });

  assert.throws(() => orderService.updateStatus(order.id, 'Shipped'), /cannot move/);

  const confirmed = orderService.updateStatus(order.id, 'Confirmed');
  assert.strictEqual(confirmed.status, 'Confirmed');
  assert.ok(confirmed.timeline.length === 2);
});

test('review only allowed on a Delivered order, by the ordering customer', () => {
  const { customer, product } = global.__fx;
  const order = orderService.placeOrder({ customerId: customer.id, productId: product.id, quantity: 1 });

  assert.throws(
    () =>
      orderService.reviewOrder(order.id, {
        customerId: customer.id,
        productId: product.id,
        rating: 5,
        comment: 'nope',
      }),
    /after it has been delivered/,
  );

  for (const status of ['Confirmed', 'Packed', 'Shipped', 'Delivered']) {
    orderService.updateStatus(order.id, status);
  }
  const { review, order: reviewed } = orderService.reviewOrder(order.id, {
    customerId: customer.id,
    productId: product.id,
    rating: 4,
    comment: 'good crop',
  });
  assert.strictEqual(review.rating, 4);
  assert.strictEqual(reviewed.status, 'Reviewed');
  assert.strictEqual(review.comment, 'good crop');

  const other = db.insert('customers', { name: 'Other', mobile: '9999900003', passwordHash: 'x' });
  assert.throws(
    () =>
      orderService.reviewOrder(order.id, { customerId: other.id, productId: product.id, rating: 1, comment: 'hijack' }),
    /only the customer who placed the order/,
  );
});
