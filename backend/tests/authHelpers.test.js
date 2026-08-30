const test = require('node:test');
const assert = require('node:assert');
const { cleanupDb } = require('./lib');

require('./lib');

const { signToken, requireAuth, requireRole, comparePassword, adminCheck } = require('../middleware/auth');
const authService = require('../services/authService');
const { AppError } = require('../middleware/errors');

test.after(cleanupDb);

test('signToken produces a verifiable, expiring JWT', () => {
  const token = signToken({ id: 7, role: 'farmer' });
  assert.strictEqual(typeof token, 'string');

  let captured;
  const next = () => {};
  requireAuth({ headers: { authorization: `Bearer ${token}` } }, {}, (err) => {
    if (!err) captured = null;
  });

  const req = { headers: { authorization: `Bearer ${token}` } };
  let user;
  requireAuth(req, {}, (err) => {
    assert.ifError(err);
    user = req.user;
  });
  assert.strictEqual(user.id, 7);
  assert.strictEqual(user.role, 'farmer');
});

test('requireAuth rejects missing and tampered tokens', () => {
  let err;
  requireAuth({ headers: {} }, {}, (e) => (err = e));
  assert.ok(err instanceof AppError);
  assert.strictEqual(err.status, 401);
});

test('requireRole permits matching roles and blocks others', () => {
  const guard = requireRole('admin');
  let err = null;
  guard({ user: { role: 'farmer' } }, {}, (e) => (err = e));
  assert.strictEqual(err.status, 403);

  err = null;
  guard({ user: { role: 'admin' } }, {}, (e) => (err = e));
  assert.ifError(err);
});

test('bcrypt comparePassword round-trips correctly', () => {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('secret123', 4);
  assert.ok(comparePassword('secret123', hash));
  assert.ok(!comparePassword('wrong', hash));
});

test('adminCheck matches the env-configured credentials', () => {
  assert.ok(adminCheck('admin', 'admin123'));
  assert.ok(!adminCheck('admin', 'nope'));
});

test('authService.register rejects a duplicate mobile', () => {
  authService.register({ role: 'farmer', name: 'First User', mobile: '9876500001', password: 'pass1234' });
  try {
    authService.register({ role: 'farmer', name: 'Second User', mobile: '9876500001', password: 'pass1234' });
    assert.fail('should have thrown a 409');
  } catch (err) {
    assert.strictEqual(err.status, 409);
  }
});

test('authService.register sanitizes names and trims input', () => {
  const { user } = authService.register({
    role: 'customer',
    name: '  Meera 123 Patil!! ',
    mobile: '9876500002',
    password: 'pass1234',
  });
  assert.strictEqual(user.name, 'Meera Patil');
  assert.strictEqual(user.mobile, '9876500002');
  assert.equal(user.passwordHash, undefined, 'hash must never be exposed');
});

test('authService.login returns a token and safe user', () => {
  authService.register({ role: 'farmer', name: 'Login Test', mobile: '9876500003', password: 'pass1234' });
  const { token, user, role } = authService.login({ role: 'farmer', mobile: ' 9876500003 ', password: 'pass1234' });
  assert.ok(token);
  assert.strictEqual(role, 'farmer');
  assert.strictEqual(user.name, 'Login Test');
});

test('authService.login rejects a wrong password', () => {
  authService.register({ role: 'customer', name: 'Wrong PW', mobile: '9876500004', password: 'pass1234' });
  assert.throws(() => authService.login({ role: 'customer', mobile: '9876500004', password: 'nope' }), /Invalid/);
});

test('authService.login rejects an unknown role', () => {
  assert.throws(() => authService.login({ role: 'superuser', mobile: '9876500004', password: 'x' }), /role/);
});
