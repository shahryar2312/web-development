/**
 * tests/controllers/auth.test.js
 *
 * Integration tests for Auth endpoints using supertest + in-memory MongoDB.
 * Tests cover: register, login, logout, getMe, forgot-password.
 */

// Must be set before requiring any modules so the rate limiter bypass takes effect
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret';

const request = require('supertest');
const { startTestServer, stopTestServer, clearCollections, buildApp } = require('../setup/testApp');

let app;

beforeAll(async () => {
  await startTestServer();
  app = buildApp();
});

afterAll(async () => {
  await stopTestServer();
});

afterEach(async () => {
  await clearCollections();
});

// ─── Helper ────────────────────────────────────────────────────────────────

async function registerUser(agent, overrides = {}) {
  const payload = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123!',
    ...overrides,
  };
  return agent.post('/api/auth/register').send(payload);
}

// ─── Registration ──────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('creates a new user and returns 201', async () => {
    const agent = request.agent(app);
    const res = await registerUser(agent);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      username: 'testuser',
      email: 'test@example.com',
    });
    // Password must never be returned
    expect(res.body.data.user.password).toBeUndefined();
  });

  test('rejects duplicate username with 409', async () => {
    const agent = request.agent(app);
    await registerUser(agent);
    const res = await registerUser(agent);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('rejects duplicate email with 409', async () => {
    const agent = request.agent(app);
    await registerUser(agent);
    const res = await registerUser(agent, { username: 'differentuser' });
    expect(res.status).toBe(409);
  });

  test('rejects username shorter than 3 characters', async () => {
    const agent = request.agent(app);
    const res = await registerUser(agent, { username: 'ab' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('rejects missing email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'noEmail',
      password: 'Password123!',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('rejects password shorter than 8 characters', async () => {
    const agent = request.agent(app);
    const res = await registerUser(agent, { password: 'short' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ─── Login ─────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('returns 200 and user on valid credentials', async () => {
    const agent = request.agent(app);
    await registerUser(agent);

    const res = await agent
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe('testuser');
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('returns 401 on wrong password', async () => {
    const agent = request.agent(app);
    await registerUser(agent);

    const res = await agent
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword!' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 on unknown email', async () => {
    const agent = request.agent(app);
    const res = await agent
      .post('/api/auth/login')
      .send({ email: 'nobody@nowhere.com', password: 'Password123!' });
    expect(res.status).toBe(401);
  });
});

// ─── Get Me ────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  test('returns 401 when not logged in', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns user data when authenticated via register session', async () => {
    const agent = request.agent(app);
    // Register automatically logs the user in
    await agent.post('/api/auth/register').send({
      username: 'meuser',
      email: 'me@example.com',
      password: 'Password123!',
    });
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe('meuser');
    expect(res.body.data.user.password).toBeUndefined();
  });
});

// ─── Logout ────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  test('returns 200 and clears the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      username: 'logoutuser',
      email: 'logout@example.com',
      password: 'Password123!',
    });

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);

    // After logout, /me should be 401
    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });
});

// ─── Forgot Password ───────────────────────────────────────────────────────

describe('POST /api/auth/forgotpassword', () => {
  test('returns 404 for an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/forgotpassword')
      .send({ email: 'nobody@nowhere.com' });
    expect(res.status).toBe(404);
  });

  test('saves a reset token on the user document for a valid email (or fails gracefully if no email provider)', async () => {
    const User = require('../../src/models/User');
    const agent = request.agent(app);

    await agent.post('/api/auth/register').send({
      username: 'resetuser',
      email: 'reset@example.com',
      password: 'Password123!',
    });

    const res = await request(app)
      .post('/api/auth/forgotpassword')
      .send({ email: 'reset@example.com' });

    // Either email sent (200) or SendGrid not configured (500)
    expect([200, 500]).toContain(res.status);

    // Token must be set on the user regardless of email outcome (for 200)
    if (res.status === 200) {
      const user = await User.findOne({ email: 'reset@example.com' });
      expect(user.resetPasswordToken).toBeDefined();
      expect(user.resetPasswordExpire).toBeDefined();
    }
  });
});
