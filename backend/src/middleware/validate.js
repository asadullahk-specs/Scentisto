/**
 * src/middleware/validate.js
 * Runs after an express-validator chain; returns a clean 422
 * with field-level messages instead of leaking internals.
 */
const { validationResult } = require("express-validator");

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: "Validation failed.",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return next();
}

module.exports = validate;
