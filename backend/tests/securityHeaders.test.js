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

/**
 * Live-browser regression: with only checkout.razorpay.com allowed, the
 * browser refused cdn.razorpay.com's risk-detection bundle with a CSP error
 * and then requested the modal's asset host as
 * checkout-static-next.razorpay.com/build/undefined, which failed ORB. These
 * pin the two origins Razorpay actually uses at runtime.
 */
test('CSP allows the Razorpay CDN bundle that checkout.js loads at runtime', () => {
  const csp = headers.get('content-security-policy');
  assert.match(csp, /script-src[^;]*cdn\.razorpay\.com/);
  assert.match(csp, /connect-src[^;]*cdn\.razorpay\.com/);
});

test('CSP allows the Razorpay static bundle host used by the modal', () => {
  const csp = headers.get('content-security-policy');
  assert.match(csp, /script-src[^;]*checkout-static-next\.razorpay\.com/);
  assert.match(csp, /style-src[^;]*checkout-static-next\.razorpay\.com/);
});

test('CSP does not open script-src to a wildcard or unsafe-inline', () => {
  const csp = headers.get('content-security-policy');
  const scriptSrc = csp.match(/script-src([^;]*)/)[1];
  assert.doesNotMatch(scriptSrc, /unsafe-inline/);
  assert.doesNotMatch(scriptSrc, /(^|\s)\*/);
});

test('COOP stays disabled so the Razorpay popup flow keeps working', () => {
  assert.equal(headers.get('cross-origin-opener-policy'), null);
});
