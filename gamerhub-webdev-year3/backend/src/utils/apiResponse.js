// Uniform response envelope used by every controller.
// Keeps the client-side parsing predictable: always check `success`, then read `data`.

/**
 * Send a successful JSON response.
 * @param {object} res - Express response object
 * @param {*} data - Payload to nest under the `data` key
 * @param {number} [statusCode=200] - HTTP status code
 * @param {object|null} [meta=null] - Optional metadata (e.g. pagination info)
 */
const success = (res, data, statusCode = 200, meta = null) => {
  const body = { success: true, data };
  if (meta) body.meta = meta; // pagination info etc.
  return res.status(statusCode).json(body);
};

/**
 * Send an error JSON response.
 * @param {object} res - Express response object
 * @param {string} message - Human-readable error description
 * @param {number} [statusCode=400] - HTTP status code
 * @param {Array|null} [errors=null] - Field-level validation errors from express-validator
 */
const error = (res, message, statusCode = 400, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors; // express-validator field errors
  return res.status(statusCode).json(body);
};

module.exports = { success, error };
