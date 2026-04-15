/**
 * Wraps an asynchronous middleware/controller function to catch any errors
 * and forward them to the next error-handling middleware.
 * This eliminates the need for repeated try/catch blocks in controllers.
 *
 * @param {Function} fn - Async handler function (req, res, next)
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
