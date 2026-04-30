const { validationResult } = require('express-validator');
const { error } = require('../utils/apiResponse');

/**
 * Middleware to check for express-validator validation errors.
 * If errors exist, it sends a 400 response with the error details.
 * Otherwise, it proceeds to the next middleware.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, 'Validation failed', 400, errors.array());
  }
  next();
};

module.exports = validateRequest;
