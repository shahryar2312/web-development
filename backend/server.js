require('dotenv').config();
const validateEnv = require('./src/config/envValidator');

// Fail-fast if environment is misconfigured
validateEnv();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./src/config/db');
const routes = require('./src/routes/index');
const errorHandler = require('./src/middleware/error');
const { generalLimiter } = require('./src/middleware/rateLimiter');

const app = express();

// Connect to MongoDB
connectDB();

// Security headers
app.use(helmet());

// Strip MongoDB operators from user-supplied data to prevent NoSQL injection
app.use(mongoSanitize());

// CORS — allow the React dev server (and production origin) with cookies
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// HTTP request logger (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Broad rate limit on all API routes
app.use('/api', generalLimiter);

// All API routes
app.use('/api', routes);

// Health check — useful for load balancers / quick sanity checks
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Centralised error handler (must come last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`GamerHub API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// Graceful shutdown on unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err.message);
  server.close(() => process.exit(1));
});
