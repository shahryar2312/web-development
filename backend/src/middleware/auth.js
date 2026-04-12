const { verifyAccessToken } = require('../utils/jwtUtils');
const { error } = require('../utils/apiResponse');
const User = require('../models/User');

/**
 * Require a valid Bearer access token.
 * Verifies the token, loads the user from the DB, and attaches them to req.user.
 * Returns 401 if the token is missing, invalid, or expired.
 * @type {import('express').RequestHandler}
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return error(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id);
    if (!user) return error(res, 'User not found.', 401);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return error(res, 'Token expired.', 401);
    return error(res, 'Invalid token.', 401);
  }
};

/**
 * Like protect, but never blocks the request.
 * Silently attaches req.user if a valid token is present; continues as a guest otherwise.
 * Use on public endpoints that return extra data for logged-in users (e.g. vote state).
 * @type {import('express').RequestHandler}
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch {
    // Silently ignore — the request continues unauthenticated
  }
  next();
};

/**
 * Restrict a route to admin users only.
 * Must be chained after `protect` (relies on req.user being set).
 * @type {import('express').RequestHandler}
 */
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return error(res, 'Admin access required.', 403);
  }
  next();
};

module.exports = { protect, optionalAuth, adminOnly };
