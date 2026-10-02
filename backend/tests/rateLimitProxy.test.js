/**
 * Regression guard for rate-limit client identification behind a reverse proxy.
 *
 * Render sits in front of the app and sets X-Forwarded-For. With Express's
 * default `trust proxy = false` that header is ignored, req.ip resolved to
 * Render's shared internal proxy address, and therefore every visitor on the
 * live site shared a single rate-limit bucket: one abuser could lock out all
 * users, and per-IP throttling was effectively disabled.
 *
 * express-rate-limit v7 logged two validation errors for that state:
 *   ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
 *   ERR_ERL_FORWARDED_HEADER
 *
 * Pinned here: the trust-proxy setting is correct and not spoofable, buckets are
 * per client, and a forged X-Forwarded-For prefix cannot move a visitor into a
 * fresh bucket.
 *
 * The two express-rate-limit validation codes are asserted through their actual
 * trigger predicates rather than by scraping logs: each validation fires only
 * once per process, so a log assertion would pass vacuously.
 */
process.env.RAZORPAY_KEY_ID = 'rzp_test_1234567890';
process.env.RAZORPAY_KEY_SECRET = 'super_secret_for_unit_tests';

// Low enough that the login limiter can be exhausted deliberately.
process.env.LOGIN_RATE_LIMIT_MAX = '3';
process.env.LOGIN_RATE_LIMIT_WINDOW_MS = '60000';

const test = require('node:test');
const assert = require('node:assert');

require('./lib');

const app = require('../app');
const config = require('../config');

const PROBE = '/api/payments/config';
const LOGIN = '/api/auth/login';

/** Remaining-request count from the draft-8 RateLimit header: '"300-in-1min"; r=299; t=60'. */
function remaining(res) {
  const header = res.headers.get('ratelimit');
  assert.ok(header, `expected a RateLimit header, got status ${res.status}`);
  const match = /r=(\d+)/.exec(header);
  assert.ok(match, `unparseable RateLimit header: ${header}`);
  return Number(match[1]);
}

function listen() {
  const server = app.listen(0);
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.on('listening', () => resolve(server));
  });
}

const close = (server) => new Promise((resolve) => server.close(resolve));

function get(port, path, xff) {
  return fetch(`http://127.0.0.1:${port}${path}`, { headers: { 'X-Forwarded-For': xff } });
}

function post(port, path, xff) {
  return fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: { 'X-Forwarded-For': xff, 'Content-Type': 'application/json' },
    body: '{}',
  });
}

test('trust proxy is set to a value that identifies clients without trusting spoofed headers', () => {
  const trustProxy = app.get('trust proxy');

  // ERR_ERL_UNEXPECTED_X_FORWARDED_FOR fires when X-Forwarded-For is present and
  // this is false, which is how the live site was configured.
  assert.notStrictEqual(
    trustProxy,
    false,
    "Express ignores X-Forwarded-For when 'trust proxy' is false, so all visitors share one bucket",
  );

  // ERR_ERL_PERMISSIVE_TRUST_PROXY fires when this is true: a client could then
  // send its own X-Forwarded-For and bypass every limiter.
  assert.notStrictEqual(trustProxy, true, "'trust proxy' must never be true behind a proxy");

  // Exactly one hop (Render), not a wildcard.
  assert.strictEqual(trustProxy, 1, "expected exactly one trusted proxy hop, got " + trustProxy);
});

test('X-Forwarded-For is authoritative even when the Forwarded header is present', async () => {
  const server = await listen();
  const { port } = server.address();

  try {
    // ERR_ERL_FORWARDED_HEADER fires when `Forwarded` is set AND req.ip still
    // equals socket.remoteAddress, i.e. the forwarded headers are being ignored.
    // Two different X-Forwarded-For values carrying an identical Forwarded header
    // must land in different buckets; if req.ip were the socket address they would
    // share one.
    const shared = 'for=198.18.7.1';
    const first = remaining(
      await fetch(`http://127.0.0.1:${port}${PROBE}`, {
        headers: { 'X-Forwarded-For': '198.18.7.1', Forwarded: shared },
      }),
    );
    const second = remaining(
      await fetch(`http://127.0.0.1:${port}${PROBE}`, {
        headers: { 'X-Forwarded-For': '198.18.7.2', Forwarded: shared },
      }),
    );

    assert.strictEqual(second, first, 'Forwarded header must not collapse clients onto one key');
  } finally {
    await close(server);
  }
});

test('each client IP gets its own rate-limit bucket', async () => {
  const server = await listen();
  const { port } = server.address();

  try {
    // The rate-limit store is module-level and outlives each listen(), so
    // assertions are relative deltas rather than absolute counts.
    const alice = '198.18.3.1';
    const bob = '198.18.3.2';

    const a1 = remaining(await get(port, PROBE, alice));
    const a2 = remaining(await get(port, PROBE, alice));
    assert.strictEqual(a2, a1 - 1, 'the same client must advance its own bucket');

    const b1 = remaining(await get(port, PROBE, bob));
    // The regression: with trust proxy unset, every request landed on Render's
    // proxy address, so bob would continue alice's counter (b1 === a2).
    assert.strictEqual(b1, a1, 'a different client must not share the bucket');

    const b2 = remaining(await get(port, PROBE, bob));
    assert.strictEqual(b2, b1 - 1, 'and advance its own counter');
    assert.strictEqual(remaining(await get(port, PROBE, alice)), a2 - 1, 'buckets advance independently');
  } finally {
    await close(server);
  }
});

test('a forged X-Forwarded-For prefix cannot redirect a client into a fresh bucket', async () => {
  const server = await listen();
  const { port } = server.address();

  try {
    const victim = '198.18.4.66';
    const first = remaining(await get(port, PROBE, victim));

    // Render appends the true peer address to X-Forwarded-For, so anything a
    // client prepends sits to the left of the real IP. trust proxy = 1 makes
    // Express take the rightmost entry, discarding the forged prefix.
    const forged = remaining(await get(port, PROBE, `10.0.0.1, ${victim}`));
    assert.strictEqual(
      forged,
      first - 1,
      'forged prefix must not have produced a fresh bucket',
    );
  } finally {
    await close(server);
  }
});

test('exhausting one client limit does not block other clients', async () => {
  const server = await listen();
  const { port } = server.address();
  const max = config.loginRateLimit.max;

  try {
    const attacker = '198.18.5.99';
    const statuses = [];
    for (let i = 0; i < max + 2; i += 1) {
      statuses.push((await post(port, LOGIN, attacker)).status);
    }

    assert.ok(
      statuses.includes(429),
      `login limiter never engaged after ${max + 2} attempts (got ${statuses.join(',')})`,
    );
    assert.strictEqual(statuses[max], 429, `attempt ${max + 1} should be limited`);
    assert.strictEqual((await post(port, LOGIN, attacker)).status, 429, 'limit persists');

    // The point of per-IP buckets: one abuser cannot lock out the whole site.
    const bystander = await post(port, LOGIN, '198.18.5.123');
    assert.notStrictEqual(bystander.status, 429, 'an unrelated client must still be served');
  } finally {
    await close(server);
  }
});