/**
 * Regression guard for the Content Security Policy that blocked Razorpay.
 *
 * helmet's defaults are `script-src 'self'` and `default-src 'self'`, which
 * make checkout.js unloadable and the payment iframe unframeable. The symptom
 * was a silent, unreproducible "Could not load the payment window" in the live
 * site while the same code worked locally, so this is pinned here.
 */
process.env.RAZORPAY_KEY_ID = 'rzp_test_1234567890';
process.env.RAZORPAY_KEY_SECRET = 'super_secret_for_unit_tests';

const test = require('node:test');
const assert = require('node:assert');

require('./lib');

const app = require('../app');

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com';
const RAZORPAY_API = 'https://api.razorpay.com';

function cspDirectives(header) {
  const map = new Map();
  for (const part of header.split(';')) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) map.set(name, values);
  }
  return map;
}

test('CSP directive set is correct', () => {
  // Read the policy helmet was configured with, via a live request.
  const server = app.listen(0);
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.on('listening', async () => {
      try {
        const { port } = server.address();
        const res = await fetch(`http://127.0.0.1:${port}/api/payments/config`);
        const header = res.headers.get('content-security-policy');
        assert.ok(header, 'a CSP header must be present');
        const d = cspDirectives(header);

        assert.ok(d.get('script-src').includes(RAZORPAY_SCRIPT), 'checkout.js must be script-src allowed');
        assert.ok(d.get('frame-src').includes(RAZORPAY_API), 'payment modal iframe must be frame-src allowed');
        assert.ok(d.get('frame-src').includes(RAZORPAY_SCRIPT), 'checkout frame must be frame-src allowed');
        assert.ok(d.get('connect-src').includes(RAZORPAY_API), 'browser calls to Razorpay must be allowed');
        assert.ok(
          d.get('img-src').some((v) => v.includes('razorpay.com')),
          'payment method logos must be img-src allowed',
        );
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
});

test('CSP stays strict everywhere else', () => {
  const server = app.listen(0);
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.on('listening', async () => {
      try {
        const { port } = server.address();
        const res = await fetch(`http://127.0.0.1:${port}/api/payments/config`);
        const d = cspDirectives(res.headers.get('content-security-policy'));

        // "Self" must remain the only script source: no unsafe-inline, no
        // wildcard, or XSS protection is gone.
        assert.deepStrictEqual(d.get('script-src'), ["'self'", RAZORPAY_SCRIPT]);
        assert.deepStrictEqual(d.get('default-src'), ["'self'"]);
        assert.deepStrictEqual(d.get('object-src'), ["'none'"]);
        assert.ok(!d.get('script-src').includes("'unsafe-inline'"));
        assert.ok(!d.get('script-src').includes('*'));
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
});
