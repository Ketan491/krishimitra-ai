process.env.DB_FILE = process.env.DB_FILE || `./data.unit-${process.pid}.json`;
process.env.OTP_COOLDOWN_SEC = process.env.OTP_COOLDOWN_SEC || '0';
process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const fs = require('fs');
const path = require('path');

function dbPath() {
  return path.resolve(__dirname, '..', process.env.DB_FILE.replace(/^\.\//, ''));
}

function cleanupDb() {
  const file = dbPath();
  if (fs.existsSync(file)) fs.unlinkSync(file);
  if (fs.existsSync(`${file}.tmp`)) fs.unlinkSync(`${file}.tmp`);
}

module.exports = { cleanupDb, dbPath };
