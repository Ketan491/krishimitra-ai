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

test('authService.login accepts an identifier field', () => {
  authService.register({ role: 'farmer', name: 'Ident Farmer', mobile: '9876500006', password: 'pass1234' });
  const { role, user } = authService.login({ role: 'farmer', identifier: '9876500006', password: 'pass1234' });
  assert.strictEqual(role, 'farmer');
  assert.strictEqual(user.name, 'Ident Farmer');

  const admin = authService.login({ role: 'admin', identifier: 'admin', password: 'admin123' });
  assert.strictEqual(admin.role, 'admin');
});

test('authService.sendOtp issues a 6-digit code for existing accounts', () => {
  authService.register({ role: 'farmer', name: 'Otp Farmer', mobile: '9876500007', password: 'pass1234' });
  const { success, devOtp, expiresInSec } = authService.sendOtp({ role: 'farmer', mobile: '9876500007' });
  assert.strictEqual(success, true);
  assert.match(devOtp, /^\d{6}$/);
  assert.ok(expiresInSec > 0);
});

test('authService.sendOtp rejects unknown mobiles and wild roles', () => {
  authService.register({ role: 'customer', name: 'Otp Customer', mobile: '9876500008', password: 'pass1234' });
  assert.throws(() => authService.sendOtp({ role: 'farmer', mobile: '9999999999' }), (e) => e.status === 404);
  assert.throws(() => authService.sendOtp({ role: 'admin', mobile: '9876500008' }), (e) => e.status === 400);
});

test('authService.verifyOtp completes a login and rejects bad codes', () => {
  authService.register({ role: 'customer', name: 'Otp Verify', mobile: '9876500009', password: 'pass1234' });
  const { devOtp } = authService.sendOtp({ role: 'customer', mobile: '9876500009' });

  const { token, role, user } = authService.verifyOtp({ role: 'customer', mobile: '9876500009', otp: devOtp });
  assert.ok(token);
  assert.strictEqual(role, 'customer');
  assert.strictEqual(user.name, 'Otp Verify');

  authService.sendOtp({ role: 'customer', mobile: '9876500009' });
  assert.throws(() => authService.verifyOtp({ role: 'customer', mobile: '9876500009', otp: '000000' }), (e) => e.status === 401);
});

test('authService.verifyOtp fails after the code is consumed once', () => {
  authService.register({ role: 'farmer', name: 'Otp Consume', mobile: '9876500011', password: 'pass1234' });
  const { devOtp } = authService.sendOtp({ role: 'farmer', mobile: '9876500011' });
  authService.verifyOtp({ role: 'farmer', mobile: '9876500011', otp: devOtp });
  assert.throws(() => authService.verifyOtp({ role: 'farmer', mobile: '9876500011', otp: devOtp }), (e) => e.status === 401);
});
