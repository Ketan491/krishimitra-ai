const test = require('node:test');
const assert = require('node:assert');
const {
  isValidMobile,
  isValidPassword,
  isPositiveNumber,
  isNonNegativeNumber,
  sanitizeText,
  sanitizeName,
} = require('../utils/validators');

test('isValidMobile accepts valid 10-digit Indian numbers', () => {
  assert.strictEqual(isValidMobile('9876543210'), true);
  assert.strictEqual(isValidMobile('6123456789'), true);
});

test('isValidMobile rejects invalid numbers', () => {
  assert.strictEqual(isValidMobile('1234567890'), false);
  assert.strictEqual(isValidMobile('98765432'), false);
  assert.strictEqual(isValidMobile('98765432100'), false);
  assert.strictEqual(isValidMobile('abcdefghij'), false);
  assert.strictEqual(isValidMobile(''), false);
  assert.strictEqual(isValidMobile(undefined), false);
});

test('isValidPassword enforces length bounds', () => {
  assert.strictEqual(isValidPassword('abcd'), true);
  assert.strictEqual(isValidPassword('abc'), false);
  assert.strictEqual(isValidPassword('a'.repeat(73)), false);
});

test('isPositiveNumber / isNonNegativeNumber behave correctly', () => {
  assert.strictEqual(isPositiveNumber(10), true);
  assert.strictEqual(isPositiveNumber(0), false);
  assert.strictEqual(isPositiveNumber(-5), false);
  assert.strictEqual(isPositiveNumber('25.5'), true);
  assert.strictEqual(isPositiveNumber('abc'), false);

  assert.strictEqual(isNonNegativeNumber(0), true);
  assert.strictEqual(isNonNegativeNumber(-1), false);
});

test('BUGFIX: whitespace/empty strings are rejected, not silently coerced to 0', () => {
  assert.strictEqual(isNonNegativeNumber(' '), false);
  assert.strictEqual(isNonNegativeNumber(''), false);
  assert.strictEqual(isPositiveNumber(' '), false);
});

test('sanitizeText strips HTML tags and trims', () => {
  assert.strictEqual(sanitizeText('  <script>alert(1)</script>Tomato  '), 'alert(1)Tomato');
  assert.strictEqual(sanitizeText('<b>Wheat</b>'), 'Wheat');
});

test('sanitizeText enforces a max length', () => {
  const long = 'a'.repeat(600);
  assert.strictEqual(sanitizeText(long, 500).length, 500);
});

test('sanitizeName strips numbers/symbols but keeps valid name characters', () => {
  assert.strictEqual(sanitizeName('Ramesh123 Patil!!'), 'Ramesh Patil');
  assert.strictEqual(sanitizeName("O'Brien-Singh"), "O'Brien-Singh");
});
