const jwt = require('jsonwebtoken');

/**
 * Sign a short-lived access token (default 15 min).
 * @param {object} payload - Data to embed — typically { id, username, role }
 * @returns {string} Signed JWT string
 */
const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });

/**
 * Sign a long-lived refresh token (default 7 days).
 * @param {object} payload - Data to embed — typically { id, username, role }
 * @returns {string} Signed JWT string
 */
const generateRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });

/**
 * Verify an access token and return its decoded payload.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 * @param {string} token
 * @returns {object} Decoded payload
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET);

/**
 * Verify a refresh token and return its decoded payload.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 * @param {string} token
 * @returns {object} Decoded payload
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

// Cookie options for the refresh token.
// httpOnly  → JS can't read it (XSS protection)
// secure    → only sent over HTTPS in production
// sameSite  → CSRF protection
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  REFRESH_COOKIE_OPTIONS,
};
