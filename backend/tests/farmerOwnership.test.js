const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

/**
 * These cover the cross-tenant guard on /api/farmers/:id.
 *
 * ownFarmerOrAdmin used to reply 403 via next() and then *return*, so the
 * calling handler kept going: it validated and applied the request body to
 * `db.update('farmers', undefined, patch)` and then tried to send a 404 as
 * well. The response had already been sent, so Express logged "Cannot set
 * headers after they are sent" and the write was attempted against an undefined
 * id. Uploading routes were worse, because multer had already written the file
 * before the guard ran, leaving an orphan on disk.
 *
 * Uses fetch against a real listener, matching integration.test.js, so no test
 * dependency is added.
 */

const DATA_FILE = require('../config').dataFile;

const app = require('../app');
const db = require('../db');
const config = require('../config');
const authService = require('../services/authService');

let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
});

test.after(() => {
  server.close();
  if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
});

async function api(method, path, { body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(baseUrl + path, {
    method,
    headers,
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

let mobileCounter = 9912000000;
function makeFarmer(name) {
  mobileCounter += 1;
  const mobile = String(mobileCounter);
  const existing = db.find('farmers', (f) => f.mobile === mobile);
  if (existing) {
    const session = authService.login({ role: 'farmer', mobile, password: 'pass1234' });
    return { token: session.token, id: session.user.id };
  }
  const created = authService.register({ role: 'farmer', name, mobile, password: 'pass1234' });
  return { token: created.token, id: created.user.id };
}

test('a farmer cannot update another farmer profile', async () => {
  const attacker = makeFarmer('Attacker');
  const victim = makeFarmer('Victim');
  const before = db.find('farmers', (f) => f.id === victim.id);

  const res = await api('PUT', `/api/farmers/${victim.id}`, {
    token: attacker.token,
    body: { name: 'Hijacked', bio: 'owned' },
  });

  assert.equal(res.status, 403, `expected 403, got ${res.status}`);
  const after = db.find('farmers', (f) => f.id === victim.id);
  assert.equal(after.name, before.name, 'the victim profile must not be modified');
});

test('a farmer cannot list another farmer crops', async () => {
  const attacker = makeFarmer('Attacker Two');
  const victim = makeFarmer('Victim Two');

  const res = await api('GET', `/api/farmers/${victim.id}/crops`, { token: attacker.token });
  assert.equal(res.status, 403, `expected 403, got ${res.status}`);
});

test('the guard stops the handler before any write is attempted', async () => {
  // The visible outcome of the old bug was identical to the fixed behaviour -
  // a 403, and the victim row untouched, because db.update with an undefined id
  // happens to match nothing. What actually differed is that the write was
  // attempted at all, and Express then complained "Cannot set headers after they
  // are sent". Asserting on the status code alone therefore passed against the
  // buggy code, so watch the write itself.
  const attacker = makeFarmer('Attacker Three');
  const victim = makeFarmer('Victim Four');

  const calls = [];
  const originalUpdate = db.update;
  db.update = (...args) => {
    calls.push(args);
    return originalUpdate.apply(db, args);
  };

  let res;
  try {
    res = await api('PUT', `/api/farmers/${victim.id}`, {
      token: attacker.token,
      body: { name: 'Should Never Be Written' },
    });
  } finally {
    db.update = originalUpdate;
  }

  assert.equal(res.status, 403, `expected 403, got ${res.status}`);
  assert.deepEqual(
    calls,
    [],
    `the handler kept running after the 403 and tried to write: ${JSON.stringify(calls)}`,
  );
});

test('a farmer can still update their own profile', async () => {  const farmer = makeFarmer('Legit Farmer');

  const res = await api('PUT', `/api/farmers/${farmer.id}`, {
    token: farmer.token,
    body: { name: 'Renamed Farmer' },
  });

  assert.equal(res.status, 200, `expected 200, got ${res.status}`);
  assert.equal(res.body.name, 'Renamed Farmer');
});

test('an admin is not blocked by the ownership guard', async () => {
  const victim = makeFarmer('Victim Three');
  const adminSession = authService.login({
    role: 'admin',
    identifier: config.adminUsername,
    password: config.adminPassword,
  });

  const res = await api('PUT', `/api/farmers/${victim.id}`, {
    token: adminSession.token,
    body: { name: 'Admin Edited' },
  });

  assert.equal(res.status, 200, `expected 200, got ${res.status}`);
});
