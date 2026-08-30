const { AppError } = require('./errors');

function buildValidator(location) {
  return (rules) => (req, res, next) => {
    for (const rule of rules) {
      const raw = req[location][rule.field];
      let value = raw;
      if (rule.sanitize && typeof raw === 'string') value = rule.sanitize(raw);
      if (rule.optional && (raw === undefined || raw === '')) continue;
      if (!rule.test(value)) {
        return next(new AppError(400, rule.message || `${rule.field} is invalid`));
      }

      if (rule.sanitize) req[location][rule.field] = value;
    }
    return next();
  };
}

const validateBody = buildValidator('body');
const validateQuery = buildValidator('query');
const validateParams = buildValidator('params');

module.exports = { validateBody, validateQuery, validateParams };
