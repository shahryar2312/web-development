const rateLimit = require('express-rate-limit');

// In test environments, rate limiters are pass-through so they don't
// interfere with rapid sequential requests from Jest.
const noopMiddleware = (_req, _res, next) => next();

const isTest = process.env.NODE_ENV === 'test';

// Strict limit on auth endpoints — slows down credential stuffing / brute-force
const authLimiter = isTest ? noopMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Broad limit applied to the whole /api prefix
const generalLimiter = isTest ? noopMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-minute cap on voting to prevent spam-voting scripts
const voteLimiter = isTest ? noopMiddleware : rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { success: false, message: 'Too many votes. Slow down!' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, generalLimiter, voteLimiter };
