const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

process.env.DB_FILE = `./data.integration-${process.pid}.json`;
const DATA_FILE = path.resolve(__dirname, '..', process.env.DB_FILE.replace(/^\.\//, ''));
if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);

process.env.LOG_LEVEL = 'silent';

const app = require('../app');

let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://localhost:${port}`;
});

test.after(() => {
  server.close();
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
});

function authed(headers, token) {
  return { ...headers, Authorization: `Bearer ${token}` };
}

async function api(method, p, { body, token, raw } = {}) {
  const headers = { ...(body && !raw ? { 'Content-Type': 'application/json' } : {}) };
  const res = await fetch(baseUrl + p, {
    method,
    headers: authed(headers, token),
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, body: json };
}

const register = async (role, extra) => {
  const res = await api('POST', '/api/auth/register', {
    body: { role, name: extra.name, mobile: extra.mobile, password: 'test1234', ...extra },
  });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  return res.body;
};

const adminToken = async () => {
  const res = await api('POST', '/api/auth/login', {
    body: { role: 'admin', mobile: 'admin', password: 'admin123' },
  });
  assert.strictEqual(res.status, 200);
  return res.body.token;
};

const approveProduct = async (productId, token) => {
  const res = await api('PUT', `/api/admin/products/${productId}/approve`, { body: { approved: true }, token });
  assert.strictEqual(res.status, 200, `admin approval should succeed: ${JSON.stringify(res.body)}`);
  return res.body;
};

test('unknown API route returns JSON 404, not an HTML page', async () => {
  const { status, body } = await api('GET', '/api/this-route-does-not-exist');
  assert.strictEqual(status, 404);
  assert.ok(body.error, 'should have a JSON error field');
});

test('registration rejects an invalid mobile number', async () => {
  const { status, body } = await api('POST', '/api/auth/register', {
    body: { role: 'farmer', name: 'Test', mobile: '12345', password: 'test1234' },
  });
  assert.strictEqual(status, 400);
  assert.match(body.error, /mobile/i);
});

test('customer profile update actually persists (token-authenticated)', async () => {
  const reg = await register('customer', { name: 'Original Name', mobile: '9111111111' });
  const customerId = reg.user.id;

  const updateRes = await api('PUT', `/api/customers/${customerId}`, {
    body: { name: 'Updated Name', address: 'New Address' },
    token: reg.token,
  });
  assert.strictEqual(updateRes.status, 200);
  assert.strictEqual(updateRes.body.name, 'Updated Name');

  const fetchRes = await api('GET', `/api/customers/${customerId}`);
  assert.strictEqual(fetchRes.body.name, 'Updated Name');
  assert.strictEqual(fetchRes.body.address, 'New Address');
});

test("whitespace-only name no longer wipes a farmer's real name", async () => {
  const reg = await register('farmer', { name: 'Ramesh Patil', mobile: '9222222222' });
  const farmerId = reg.user.id;

  const updateRes = await api('PUT', `/api/farmers/${farmerId}`, {
    body: { name: '   ' },
    token: reg.token,
  });
  assert.strictEqual(updateRes.status, 400);

  const fetchRes = await api('GET', `/api/farmers/${farmerId}`);
  assert.strictEqual(fetchRes.body.name, 'Ramesh Patil');
});

test('unauthenticated requests to protected routes are rejected', async () => {
  const { status } = await api('PUT', '/api/customers/1', { body: { name: 'X' } });
  assert.strictEqual(status, 401);
});

test("farmers cannot act on other farmers' products", async () => {
  const farmerA = await register('farmer', { name: 'Farmer A', mobile: '9333333333' });
  const farmerB = await register('farmer', { name: 'Farmer B', mobile: '9555555555' });

  const form = new FormData();
  form.append('cropName', 'TestCropAB');
  form.append('price', '10');
  form.append('quantity', '50');
  const prodRes = await fetch(baseUrl + '/api/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${farmerA.token}` },
    body: form,
  });
  const product = await prodRes.json();

  const tamper = await api('PUT', `/api/products/${product.id}`, {
    body: { price: '1' },
    token: farmerB.token,
  });
  assert.strictEqual(tamper.status, 403);

  const own = await api('PUT', `/api/products/${product.id}`, {
    body: { price: '12' },
    token: farmerA.token,
  });
  assert.strictEqual(own.status, 200);
  assert.strictEqual(own.body.price, 12);
});

test('full order lifecycle: order → confirm → pack → ship → deliver → review', async () => {
  const farmer = await register('farmer', { name: 'Farmer C', mobile: '9444444444' });
  const customer = await register('customer', { name: 'Customer C', mobile: '9666666666' });

  const form = new FormData();
  form.append('cropName', 'TestCropC');
  form.append('price', '10');
  form.append('quantity', '50');
  const prodRes = await fetch(baseUrl + '/api/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${farmer.token}` },
    body: form,
  });
  const product = await prodRes.json();
  assert.strictEqual(product.approved, null, 'new products start as pending moderation');
  await approveProduct(product.id, await adminToken());

  const orderRes = await api('POST', '/api/orders', {
    body: { productId: product.id, quantity: 2 },
    token: customer.token,
  });
  assert.strictEqual(orderRes.status, 201);
  const order = orderRes.body;
  assert.strictEqual(order.status, 'Pending');
  assert.ok(order.timeline.length >= 1, 'order should start with a timeline');

  const earlyReview = await api('POST', `/api/orders/${order.id}/review`, {
    body: { productId: product.id, rating: 5, comment: 'too early' },
    token: customer.token,
  });
  assert.strictEqual(earlyReview.status, 400);

  const skip = await api('PUT', `/api/orders/${order.id}/status`, {
    body: { status: 'Delivered' },
    token: farmer.token,
  });
  assert.strictEqual(skip.status, 400, 'should require Packed/Shipped first');

  for (const status of ['Confirmed', 'Packed', 'Shipped', 'Delivered']) {
    const r = await api('PUT', `/api/orders/${order.id}/status`, { body: { status }, token: farmer.token });
    assert.strictEqual(r.status, 200, `transition to ${status} should work: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.status, status);
  }

  const reviewRes = await api('POST', `/api/orders/${order.id}/review`, {
    body: { productId: product.id, rating: 5, comment: 'great produce' },
    token: customer.token,
  });
  assert.strictEqual(reviewRes.status, 201);
  assert.strictEqual(reviewRes.body.order.status, 'Reviewed');

  const other = await register('customer', { name: 'Other C', mobile: '9101010101' });
  const wrongUser = await api('POST', `/api/orders/${order.id}/review`, {
    body: { productId: product.id, rating: 1, comment: 'not mine' },
    token: other.token,
  });
  assert.strictEqual(wrongUser.status, 403);
});

test('placing an order conserves stock; cancelling restores it', async () => {
  const farmer = await register('farmer', { name: 'Farmer D', mobile: '9777777777' });
  const customer = await register('customer', { name: 'Customer D', mobile: '9888888888' });

  const form = new FormData();
  form.append('cropName', 'StockCrop');
  form.append('price', '5');
  form.append('quantity', '10');
  const prodRes = await fetch(baseUrl + '/api/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${farmer.token}` },
    body: form,
  });
  const product = await prodRes.json();
  assert.strictEqual(product.quantity, 10);
  await approveProduct(product.id, await adminToken());

  const oversell = await api('POST', '/api/orders', {
    body: { productId: product.id, quantity: 99 },
    token: customer.token,
  });
  assert.strictEqual(oversell.status, 400);

  const orderRes = await api('POST', '/api/orders', {
    body: { productId: product.id, quantity: 4 },
    token: customer.token,
  });
  assert.strictEqual(orderRes.status, 201);

  const afterOrder = await api('GET', `/api/products/${product.id}`);
  assert.strictEqual(afterOrder.body.quantity, 6);

  const cancelRes = await api('PUT', `/api/orders/${orderRes.body.id}/cancel`, { body: {}, token: customer.token });
  assert.strictEqual(cancelRes.status, 200);
  const afterCancel = await api('GET', `/api/products/${product.id}`);
  assert.strictEqual(afterCancel.body.quantity, 10);
});

test('marketplace pagination returns correct page metadata', async () => {
  const farmer = await register('farmer', { name: 'Farmer E', mobile: '9121212121' });
  const productIds = [];
  for (let i = 0; i < 5; i++) {
    const form = new FormData();
    form.append('cropName', `PagedCrop${i}`);
    form.append('price', '15');
    form.append('quantity', '20');
    const r = await fetch(baseUrl + '/api/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer.token}` },
      body: form,
    });
    productIds.push((await r.json()).id);
  }
  const token = await adminToken();
  for (const id of productIds) await approveProduct(id, token);

  const { status, body } = await api('GET', '/api/products?page=1&limit=2');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.items.length, 2);
  assert.ok(body.total >= 5);
  assert.ok(body.totalPages >= 3);
});

test('admin can sign in, see summary and approve a product', async () => {
  const admin = await api('POST', '/api/auth/login', {
    body: { role: 'admin', mobile: 'admin', password: 'admin123' },
  });
  assert.strictEqual(admin.status, 200);
  assert.strictEqual(admin.body.role, 'admin');

  const summary = await api('GET', '/api/admin/summary', { token: admin.body.token });
  assert.strictEqual(summary.status, 200);
  assert.ok(typeof summary.body.farmers === 'number');
  assert.ok(Array.isArray(summary.body.orderTrend));

  const customer = await register('customer', { name: 'Sneaky C', mobile: '9131313131' });
  const blocked = await api('GET', '/api/admin/farmers', { token: customer.token });
  assert.strictEqual(blocked.status, 403);
});
