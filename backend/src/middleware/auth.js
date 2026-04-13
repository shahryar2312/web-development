const { error } = require('../utils/apiResponse');
const User = require('../models/User');

/**
 * Require a valid session.
 * Checks if userId is in the session, loads the user from the DB, and attaches them to req.user.
 * Returns 401 if the session is missing or user is not found.
 * @type {import('express').RequestHandler}
 */
const protect = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return error(res, 'Access denied. Please log in.', 401);
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      // Session exists but user doesn't; clear it.
      req.session.destroy();
      return error(res, 'User not found.', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    return error(res, 'Authentication failed.', 401);
  }
};

/**
 * Like protect, but never blocks the request.
 * Silently attaches req.user if a valid session is present; continues as a guest otherwise.
 * @type {import('express').RequestHandler}
 */
const optionalAuth = async (req, res, next) => {
  try {
    if (req.session?.userId) {
      const user = await User.findById(req.session.userId);
      if (user) req.user = user;
    }
  } catch {
    // Silently ignore
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
