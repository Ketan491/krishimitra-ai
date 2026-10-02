const test = require('node:test');
const assert = require('node:assert/strict');

/**
 * Clickjacking headers regressed once already: a commit set
 * `frameguard: false` and `frameAncestors: null` on the theory that Razorpay's
 * checkout iframe needed it. It does not - frame-src controls what we embed,
 * frame-ancestors/X-Frame-Options control who may embed us. These tests pin the
 * real headers so that change cannot silently come back.
 */

const app = require('../app');

let server;
let baseUrl;
let headers;

test.before(async () => {
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  headers = res.headers;
});

test.after(() => {
  server.close();
});

test('sends X-Frame-Options: SAMEORIGIN', () => {
  assert.equal(headers.get('x-frame-options'), 'SAMEORIGIN');
});

test('CSP restricts frame-ancestors to self', () => {
  assert.match(headers.get('content-security-policy'), /frame-ancestors\s+'self'/);
});

test('CSP does not null out the clickjacking directive', () => {
  assert.doesNotMatch(headers.get('content-security-policy'), /frame-ancestors\s+(\*|'none'|none)/);
});

test('Razorpay checkout is still allowed through frame-src and script-src', () => {
  const csp = headers.get('content-security-policy');
  assert.match(csp, /frame-src[^;]*api\.razorpay\.com/);
  assert.match(csp, /frame-src[^;]*checkout\.razorpay\.com/);
  assert.match(csp, /script-src[^;]*checkout\.razorpay\.com/);
  assert.match(csp, /connect-src[^;]*api\.razorpay\.com/);
});

test('COOP stays disabled so the Razorpay popup flow keeps working', () => {
  assert.equal(headers.get('cross-origin-opener-policy'), null);
});
