const MOBILE_REGEX = /^[6-9]\d{9}$/;

function isValidMobile(mobile) {
  return typeof mobile === 'string' && MOBILE_REGEX.test(mobile.trim());
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 4 && password.length <= 72;
}

function isUsableNumericInput(value) {
  if (typeof value === 'number') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
}

function isPositiveNumber(value) {
  if (!isUsableNumericInput(value)) return false;
  const n = Number(value);
  return !Number.isNaN(n) && Number.isFinite(n) && n > 0;
}

function isNonNegativeNumber(value) {
  if (!isUsableNumericInput(value)) return false;
  const n = Number(value);
  return !Number.isNaN(n) && Number.isFinite(n) && n >= 0;
}

function sanitizeText(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLength);
}

function sanitizeName(value) {
  const clean = sanitizeText(value, 100);
  return clean
    .replace(/[^a-zA-Z\s.'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function validate(checks) {
  for (const [ok, message] of checks) {
    if (!ok) return message;
  }
  return null;
}

module.exports = {
  isValidMobile,
  isValidPassword,
  isPositiveNumber,
  isNonNegativeNumber,
  sanitizeText,
  sanitizeName,
  validate,
};
