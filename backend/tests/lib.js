process.env.DB_FILE = process.env.DB_FILE || `./data.unit-${process.pid}.json`;

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
