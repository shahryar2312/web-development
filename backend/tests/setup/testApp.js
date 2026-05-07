/**
 * tests/setup/testApp.js
 *
 * Creates a minimal Express app backed by an in-memory MongoDB instance.
 * Shared by all test files — avoids connecting to the real Atlas cluster.
 */
const express = require('express');
const session = require('express-session');
const mongoSanitize = require('express-mongo-sanitize');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const routes = require('../../src/routes/index');
const errorHandler = require('../../src/middleware/error');

let mongoServer;

async function startTestServer() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

async function stopTestServer() {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}

async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(mongoSanitize());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      // MemoryStore is fine for tests
    })
  );
  app.use('/api', routes);
  app.use(errorHandler);
  return app;
}

module.exports = { startTestServer, stopTestServer, clearCollections, buildApp };
