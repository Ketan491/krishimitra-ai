class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    if (details) this.details = details;
    this.expose = true;
  }
}

function notFound(req, res, next) {
  if (req.path.startsWith('/api')) {
    return next(new AppError(404, `No API route: ${req.method} ${req.originalUrl}`));
  }
  next();
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const multer = require('multer');
  let status = err.status || (err.expose ? err.status : 500) || 500;

  if (err instanceof multer.MulterError || (err.message && err.message.includes('Only JPG, PNG or WEBP images'))) {
    status = 400;
  }
  if (status >= 500) console.error(err);

  const payload = { error: err.message || 'Something went wrong on the server.' };
  if (err.details) payload.details = err.details;
  res.status(status).json(payload);
}

module.exports = { AppError, notFound, errorHandler };
