/**
 * Regression guard for two issues found in a full project audit.
 *
 * 1. `POST /api/auth/otp/send` returned the OTP code in the response body
 *    (`devOtp`) with no environment gate anywhere in the repo. Anyone who knew a
 *    registered mobile number could request a code, read it straight out of the
 *    JSON, and log in as that user - a full account takeover with no access to
 *    the victim's phone. Confirmed live before the fix.
 *
 * 2. `cancelOrder` gated only on order *status*, never on paymentStatus, so a
 *    captured Razorpay payment could be cancelled: the money stayed taken, the
 *    stock went back on the shelf and the farmer had no order to fulfil. There
 *    is no refund path in the codebase. Confirmed live before the fix.
 */
process.env.RAZORPAY_KEY_ID = 'rzp_test_1234567890';
process.env.RAZORPAY_KEY_SECRET = 'super_secret_for_unit_tests';

const test = require('node:test');
const assert = require('node:assert');

require('./lib');

const config = require('../config');
const db = require('../db');
const authService = require('../services/authService');
const orderService = require('../services/orderService');

function uniqueMobile() {
  return `9${String(Date.now()).slice(-9)}`;
}

/**
 * Run fn with config.exposeOtp forced to a known value.
 *
 * The flag is driven by the environment, and a developer machine legitimately
 * sets EXPOSE_OTP=true to log in without an SMS gateway. These tests must
 * describe the *deployed* behaviour, so they pin the flag themselves rather than
 * inheriting whatever the local .env happens to say.
 */
function withExposeOtp(value, fn) {
  const previous = config.exposeOtp;
  config.exposeOtp = value;
  try {
    return fn();
  } finally {
    config.exposeOtp = previous;
  }
}

test('EXPOSE_OTP falls back to off when the variable is absent', () => {
  // config.js calls dotenv with no path, so dotenv reads process.cwd()/.env.
  // Running from a directory with no .env isolates the *fallback* from a
  // developer's local EXPOSE_OTP=true, which is what we want to assert.
  const { execFileSync } = require('node:child_process');
  const path = require('node:path');
  const os = require('node:os');
  const fs = require('node:fs');

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'otp-default-'));
  const configPath = path.resolve(__dirname, '..', 'config.js');
  try {
    const out = execFileSync(process.execPath, ['-e', `console.log(require(${JSON.stringify(configPath)}).exposeOtp)`], {
      cwd: scratch,
      encoding: 'utf8',
      env: { ...process.env, EXPOSE_OTP: '' },
    });
    // dotenv prints a banner to stdout, so read the last non-empty line.
    const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    assert.strictEqual(lines[lines.length - 1], 'false', 'EXPOSE_OTP must fall back to false');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test('OTP code is never returned in the API response by default', () => {
  const mobile = uniqueMobile();
  db.insert('customers', { name: 'Otp Subject', mobile, password: 'x', addresses: [] });

  const res = withExposeOtp(false, () => authService.sendOtp({ role: 'customer', mobile }));

  assert.strictEqual(res.success, true);
  assert.ok(
    !('devOtp' in res),
    `the OTP code must not be echoed to the client, got ${JSON.stringify(res)}`,
  );
  assert.strictEqual(res.otp, undefined);
  assert.strictEqual(res.code, undefined);
  // The rest of the contract the frontend relies on must survive.
  assert.strictEqual(typeof res.expiresInSec, 'number');
});

test('no field of the OTP response leaks the code', () => {
  const mobile = uniqueMobile();
  db.insert('customers', { name: 'Leak Check', mobile, password: 'x', addresses: [] });

  const res = withExposeOtp(false, () => authService.sendOtp({ role: 'customer', mobile }));

  // issueOtp returns a 6-digit code; assert no value in the payload looks like it.
  const suspicious = Object.values(res).filter(
    (v) => typeof v === 'string' && /^\d{4,8}$/.test(v),
  );
  assert.deepStrictEqual(suspicious, [], `numeric code-like value leaked: ${JSON.stringify(res)}`);
});

test('the opt-in still returns the code so local development can log in', () => {
  const mobile = uniqueMobile();
  db.insert('customers', { name: 'Dev Otp', mobile, password: 'x', addresses: [] });

  const res = withExposeOtp(true, () => authService.sendOtp({ role: 'customer', mobile }));
  assert.match(res.devOtp, /^\d{6}$/);
});

test('a paid order cannot be cancelled', () => {
  const product = db.all('products').find((p) => p.approved === true && p.quantity > 0);
  const customer = db.insert('customers', {
    name: 'Paid Buyer', mobile: uniqueMobile(), password: 'x', addresses: [],
  });

  const order = orderService.placeOrder({
    customerId: customer.id,
    productId: product.id,
    quantity: 1,
    paymentMethod: 'razorpay',
  });

  // State the gateway verify path produces on a captured payment.
  db.update('orders', order.id, { paymentStatus: 'paid', status: 'Confirmed' });

  const stockBefore = db.all('products').find((p) => p.id === product.id).quantity;

  assert.throws(
    () => orderService.cancelOrder(order.id, 'changed my mind'),
    (err) => {
      assert.strictEqual(err.status, 400);
      assert.match(err.message, /already been paid/i);
      return true;
    },
    'cancelling a paid order must be refused',
  );

  const after = db.find('orders', (o) => o.id === order.id);
  const stockAfter = db.all('products').find((p) => p.id === product.id).quantity;

  assert.notStrictEqual(after.status, 'Cancelled', 'order must stay open');
  assert.strictEqual(after.paymentStatus, 'paid', 'payment state must be untouched');
  assert.strictEqual(stockAfter, stockBefore, 'stock must not be released for a paid order');
});

test('an unpaid order can still be cancelled and restocked', () => {
  const product = db.all('products').find((p) => p.approved === true && p.quantity > 0);
  const customer = db.insert('customers', {
    name: 'Unpaid Buyer', mobile: uniqueMobile(), password: 'x', addresses: [],
  });

  const order = orderService.placeOrder({
    customerId: customer.id,
    productId: product.id,
    quantity: 1,
    paymentMethod: 'cod',
  });

  const stockBefore = db.all('products').find((p) => p.id === product.id).quantity;
  orderService.cancelOrder(order.id, 'ordered by mistake');

  const after = db.find('orders', (o) => o.id === order.id);
  const stockAfter = db.all('products').find((p) => p.id === product.id).quantity;

  assert.strictEqual(after.status, 'Cancelled');
  assert.strictEqual(after.paymentStatus, 'pending');
  assert.strictEqual(stockAfter, stockBefore + 1, 'unpaid stock must be returned to the shelf');
});