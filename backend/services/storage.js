const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const ROOT = path.resolve(__dirname, '..', 'uploads');
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function newFilename(file) {
  const ext = EXT[file.mimetype] || '.jpg';
  return `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
}

function uploader(subdir, field = 'photo') {
  const target = path.join(ROOT, subdir);
  ensureDir(target);
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, target),
    filename: (req, file, cb) => cb(null, newFilename(file)),
  });
  const filter = (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Only JPG, PNG or WEBP images are allowed'));
  };
  return multer({
    storage,
    fileFilter: filter,
    limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
  }).single(field);
}

function removeFile(publicUrl) {
  if (!publicUrl) return;
  if (!publicUrl.startsWith('/uploads')) return;
  const rel = publicUrl.replace('/uploads/', '');
  const abs = path.join(ROOT, rel);
  if (abs.startsWith(ROOT) && fs.existsSync(abs)) {
    try {
      fs.unlinkSync(abs);
    } catch {}
  }
}

module.exports = { uploader, removeFile, UPLOAD_ROOT: ROOT };
