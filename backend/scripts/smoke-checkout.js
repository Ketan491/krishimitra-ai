/**
 * End-to-end smoke test for the checkout API against a real running server.
 *
 *   node scripts/smoke-checkout.js [baseUrl]
 *
 * Uses a throwaway database so it never touches dev data. Razorpay is left
 * unconfigured on purpose: that is the interesting offline case, where COD must
 * still work end to end.
 */
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const tmpDb = path.join(os.tmpdir(), `km-smoke-${process.pid}.json`);
process.env.DB_FILE = tmpDb;
process.env.JWT_SECRET = 'smoke-secret';
process.env.ADMIN_USERNAME = 'smokeadmin';
process.env.ADMIN_PASSWORD = 'smokeadmin123';
delete process.env.RAZORPAY_KEY_ID;
delete process.env.RAZORPAY_KEY_SECRET;
process.env.COD_ENABLED = 'true';
process.env.COD_MAX_AMOUNT = '500';

const app = require('../app');
const bcrypt = require('bcryptjs');
const PASSWORD = 'smoke123';
const HASH = bcrypt.hashSync(PASSWORD, 8);
const db = require('../db');

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function call(server, method, path, { token, body } = {}) {
  const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
}

async function main() {
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = server.address().port;
  console.log(`checkout smoke test on port ${base}\n`);

  // --- fixtures -------------------------------------------------------------
  const smokeFarmer = db.insert('farmers', {
    name: 'Smoke Farmer',
    mobile: '9888800001',
    passwordHash: HASH,
    location: 'Pune',
    soilType: 'loamy',
    landSize: 1,
  });
  const cheap = db.insert('products', {
    farmerId: smokeFarmer.id,
    category: 'vegetable',
    cropName: 'Smoke Onion',
    price: 30,
    quantity: 50,
    unit: 'kg',
    approved: true,
    createdAt: new Date().toISOString(),
  });
  const pricey = db.insert('products', {
    farmerId: smokeFarmer.id,
    category: 'vegetable',
    cropName: 'Smoke Saffron',
    price: 400,
    quantity: 20,
    unit: 'kg',
    approved: true,
    createdAt: new Date().toISOString(),
  });

  console.log('payment config');
  const cfg = await call(server, 'GET', '/api/payments/config');
  check('config responds', cfg.status === 200, `status ${cfg.status}`);
  check('online reported as disabled without keys', cfg.body.enabled === false);
  check('COD advertised as enabled', cfg.body.codEnabled === true);
  check('COD cap advertised', cfg.body.codMaxAmount === 500);
  check('no key secret leaked', !JSON.stringify(cfg.body).includes(process.env.JWT_SECRET));

  console.log('\nauth is required');
  const anon = await call(server, 'POST', '/api/payments/create-order', {
    body: { productId: cheap.id, quantity: 1, address: 'x', paymentMethod: 'cod' },
  });
  check('anonymous checkout is rejected', anon.status === 401, `status ${anon.status}`);

  console.log('\ncustomer login');
  db.insert('customers', {
    name: 'Smoke Customer',
    mobile: '9888800002',
    passwordHash: HASH,
    address: 'Smoke Street, Pune',
    addresses: [{ id: 1, label: 'Home', fullAddress: 'Smoke Street, Pune', isDefault: true }],
  });
  const login = await call(server, 'POST', '/api/auth/login', {
    body: { role: 'customer', mobile: '9888800002', password: PASSWORD },
  });
  check('login succeeds', login.status === 200, `status ${login.status}`);
  const token = login.body?.token;
  check('token issued', Boolean(token));

  console.log('\ncash on delivery order');
  const cod = await call(server, 'POST', '/api/payments/create-order', {
    token,
    body: { productId: cheap.id, quantity: 2, address: 'Smoke Street, Pune', paymentMethod: 'cod' },
  });
  check('COD order created', cod.status === 201, `status ${cod.status} ${JSON.stringify(cod.body)}`);
  check('stored as COD', cod.body?.paymentMethod === 'cod');
  check('starts pending/unpaid', cod.body?.order?.paymentStatus === 'pending');
  check('status is Pending', cod.body?.order?.status === 'Pending');
  check('no Razorpay order attached', cod.body?.razorpayOrderId === undefined);
  check('server-computed amount (2 x 30)', cod.body?.amount === 60, `got ${cod.body?.amount}`);
  check(
    'stock decremented once',
    db.find('products', (p) => p.id === cheap.id).quantity === 48,
    `got ${db.find('products', (p) => p.id === cheap.id).quantity}`,
  );

  console.log('\nduplicate protection');
  const stockBefore = db.find('products', (p) => p.id === cheap.id).quantity;
  const key = 'smoke-dup-key-1';
  const first = await call(server, 'POST', '/api/payments/create-order', {
    token,
    body: {
      productId: cheap.id,
      quantity: 1,
      address: 'Smoke Street, Pune',
      paymentMethod: 'cod',
      idempotencyKey: key,
    },
  });
  const second = await call(server, 'POST', '/api/payments/create-order', {
    token,
    body: {
      productId: cheap.id,
      quantity: 1,
      address: 'Smoke Street, Pune',
      paymentMethod: 'cod',
      idempotencyKey: key,
    },
  });
  check('first idempotent order created', first.status === 201);
  check('retry returns the same order', second.body?.order?.id === first.body?.order?.id);
  check('stock reserved only once', db.find('products', (p) => p.id === cheap.id).quantity === stockBefore - 1);

  console.log('\nCOD rules are enforced server-side');
  const overCap = await call(server, 'POST', '/api/payments/create-order', {
    token,
    body: { productId: pricey.id, quantity: 2, address: 'Smoke Street, Pune', paymentMethod: 'cod' },
  });
  check('order above the COD cap is refused', overCap.status === 400, `status ${overCap.status}`);
  check(
    'stock untouched after refusal',
    db.find('products', (p) => p.id === pricey.id).quantity === 20,
    `got ${db.find('products', (p) => p.id === pricey.id).quantity}`,
  );

  const overStock = await call(server, 'POST', '/api/payments/create-order', {
    token,
    body: { productId: cheap.id, quantity: 9999, address: 'Smoke Street, Pune', paymentMethod: 'cod' },
  });
  check('over-ordering is refused', overStock.status === 400, `status ${overStock.status}`);

  const badMethod = await call(server, 'POST', '/api/payments/create-order', {
    token,
    body: { productId: cheap.id, quantity: 1, address: 'x', paymentMethod: 'cheque' },
  });
  check('unknown payment method is refused', badMethod.status === 400, `status ${badMethod.status}`);

  const online = await call(server, 'POST', '/api/payments/create-order', {
    token,
    body: { productId: cheap.id, quantity: 1, address: 'x', paymentMethod: 'razorpay' },
  });
  check(
    'online payment refused when unconfigured',
    online.status === 503,
    `status ${online.status}`,
  );

  console.log('\nCOD orders cannot be settled by the gateway');
  const forged = await call(server, 'POST', '/api/payments/verify', {
    token,
    body: {
      orderId: cod.body.order.id,
      razorpayOrderId: 'order_forged',
      razorpayPaymentId: 'pay_forged',
      razorpaySignature: 'deadbeef',
    },
  });
  check('forged callback rejected', forged.status >= 400, `status ${forged.status}`);
  check(
    'order still unpaid',
    db.find('orders', (o) => o.id === cod.body.order.id).paymentStatus === 'pending',
  );

  const discard = await call(server, 'POST', '/api/payments/cancel-order', {
    token,
    body: { orderId: cod.body.order.id },
  });
  check('COD order cannot be discarded as abandoned', discard.status === 400, `status ${discard.status}`);

  console.log('\nCOD settles on delivery');
  const cod2 = await call(server, 'POST', '/api/payments/create-order', {
    token,
    body: { productId: cheap.id, quantity: 1, address: 'Smoke Street, Pune', paymentMethod: 'cod' },
  });
  const oid = cod2.body.order.id;
  const farmer = await farmerToken(server);

  for (const status of ['Confirmed', 'Packed', 'Shipped', 'Delivered']) {
    const r = await call(server, 'PUT', `/api/orders/${oid}/status`, {
      token: farmer,
      body: { status },
    });
    check(`status -> ${status}`, r.status === 200, `status ${r.status}`);
  }
  const settled = db.find('orders', (o) => o.id === oid);
  check('COD marked paid on delivery', settled.paymentStatus === 'paid', `got ${settled.paymentStatus}`);
  check('settlement timestamped', Boolean(settled.paidAt));

  console.log('\nlegacy plain order route');
  const plain = await call(server, 'POST', '/api/orders', {
    token,
    body: { productId: cheap.id, quantity: 1, address: 'Smoke Street, Pune' },
  });
  check('plain order still works', plain.status === 201, `status ${plain.status}`);
  check('plain order is COD', plain.body?.paymentMethod === 'cod');

  const plainOnline = await call(server, 'POST', '/api/orders', {
    token,
    body: { productId: cheap.id, quantity: 1, address: 'x', paymentMethod: 'razorpay' },
  });
  check('plain route refuses online payments', plainOnline.status === 400, `status ${plainOnline.status}`);

  console.log('\ncustomer sees payment state on their orders');
  const customerId = login.body?.user?.id;
  const list = await call(server, 'GET', `/api/orders/customer/${customerId}`, { token });
  check('order list loads', list.status === 200, `status ${list.status}`);
  check('list carries payment fields', Boolean(list.body?.[0]?.paymentMethod));

  server.close();
  fs.rmSync(tmpDb, { force: true });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

async function farmerToken(server) {
  const login = await call(server, 'POST', '/api/auth/login', {
    body: { role: 'farmer', mobile: '9888800001', password: PASSWORD },
  });
  return login.body?.token;
}

main().catch((err) => {
  console.error('smoke test crashed:', err);
  process.exit(1);
});
