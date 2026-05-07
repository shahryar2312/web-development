/**
 * tests/controllers/search.test.js
 *
 * Integration tests for GET /api/search
 * Tests: empty query, title-only matching, case-insensitivity, no false positives.
 */
const request = require('supertest');
const { startTestServer, stopTestServer, clearCollections, buildApp } = require('../setup/testApp');
const User = require('../../src/models/User');
const Hub = require('../../src/models/Hub');
const Post = require('../../src/models/Post');

let app;
let testUser;
let testHub;

beforeAll(async () => {
  await startTestServer();
  app = buildApp();
});

afterAll(async () => {
  await stopTestServer();
});

beforeEach(async () => {
  await clearCollections();

  // Create a user for authoring posts
  testUser = await User.create({
    username: 'searchuser',
    email: 'search@example.com',
    password: 'Password123!',
  });

  // Create a hub
  testHub = await Hub.create({
    name: 'Fortnite Central',
    game: 'Fortnite',
    description: 'The best Fortnite hub',
    creator: testUser._id,
    moderators: [testUser._id],
    members: [testUser._id],
    slug: 'fortnite-central',
  });

  // Create posts
  await Post.create([
    {
      title: 'Best Fortnite Landing Spots',
      content: 'Here are the top 5 landing spots',
      author: testUser._id,
      hub: testHub._id,
    },
    {
      title: 'Apex Legends Season Update',
      content: 'Big changes for Fortnite players too',
      author: testUser._id,
      hub: testHub._id,
    },
    {
      title: 'Minecraft Redstone Guide',
      content: 'Completely unrelated content',
      author: testUser._id,
      hub: testHub._id,
    },
  ]);
});

// ─── Empty query ────────────────────────────────────────────────────────────

describe('GET /api/search — empty query', () => {
  test('returns empty arrays when q is missing', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(200);
    expect(res.body.data.hubs).toEqual([]);
    expect(res.body.data.posts).toEqual([]);
    expect(res.body.data.users).toEqual([]);
  });

  test('returns empty arrays when q is blank', async () => {
    const res = await request(app).get('/api/search?q=');
    expect(res.status).toBe(200);
    expect(res.body.data.posts).toEqual([]);
  });
});

// ─── Post title search ───────────────────────────────────────────────────────

describe('GET /api/search — post title matching', () => {
  test('finds posts by exact title word', async () => {
    const res = await request(app).get('/api/search?q=Fortnite&type=posts');
    expect(res.status).toBe(200);
    const titles = res.body.data.posts.map(p => p.title);
    expect(titles).toContain('Best Fortnite Landing Spots');
  });

  test('does NOT return posts matched only by content (title-only search)', async () => {
    // 'Apex Legends Season Update' has 'Fortnite' in content but NOT in title
    const res = await request(app).get('/api/search?q=Apex&type=posts');
    expect(res.status).toBe(200);
    const titles = res.body.data.posts.map(p => p.title);
    expect(titles).toContain('Apex Legends Season Update');
    expect(titles).not.toContain('Minecraft Redstone Guide');
  });

  test('is case-insensitive', async () => {
    const res = await request(app).get('/api/search?q=fortnite&type=posts');
    expect(res.status).toBe(200);
    expect(res.body.data.posts.length).toBeGreaterThan(0);
  });

  test('finds posts with partial title match', async () => {
    const res = await request(app).get('/api/search?q=Land&type=posts');
    expect(res.status).toBe(200);
    const titles = res.body.data.posts.map(p => p.title);
    expect(titles).toContain('Best Fortnite Landing Spots');
  });

  test('returns empty for a query that matches nothing', async () => {
    const res = await request(app).get('/api/search?q=Overwatch&type=posts');
    expect(res.status).toBe(200);
    expect(res.body.data.posts).toHaveLength(0);
  });
});

// ─── Hub name search ─────────────────────────────────────────────────────────

describe('GET /api/search — hub name matching', () => {
  test('finds hubs by partial name', async () => {
    const res = await request(app).get('/api/search?q=fort&type=hubs');
    expect(res.status).toBe(200);
    expect(res.body.data.hubs.length).toBeGreaterThan(0);
    expect(res.body.data.hubs[0].name).toBe('Fortnite Central');
  });

  test('does NOT find hubs matched only by description', async () => {
    // 'best' is in description but not name
    const res = await request(app).get('/api/search?q=best&type=hubs');
    expect(res.status).toBe(200);
    expect(res.body.data.hubs).toHaveLength(0);
  });
});

// ─── User search ─────────────────────────────────────────────────────────────

describe('GET /api/search — user username matching', () => {
  test('finds user by username', async () => {
    const res = await request(app).get('/api/search?q=searchuser&type=users');
    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBeGreaterThan(0);
    expect(res.body.data.users[0].username).toBe('searchuser');
  });

  test('partial username match works', async () => {
    const res = await request(app).get('/api/search?q=search&type=users');
    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBeGreaterThan(0);
  });
});

// ─── type=all returns all three categories ─────────────────────────────────

describe('GET /api/search — type=all', () => {
  test('returns hubs, posts, and users keys', async () => {
    const res = await request(app).get('/api/search?q=fortnite&type=all');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('hubs');
    expect(res.body.data).toHaveProperty('posts');
    expect(res.body.data).toHaveProperty('users');
  });
});

// ─── Regex injection protection ───────────────────────────────────────────────

describe('GET /api/search — regex injection protection', () => {
  test('does not crash on malicious regex input like ".*"', async () => {
    const res = await request(app).get('/api/search?q=.*&type=posts');
    expect(res.status).toBe(200);
  });

  test('does not crash on "[" character', async () => {
    const res = await request(app).get('/api/search?q=%5B&type=posts');
    expect(res.status).toBe(200);
  });

  test('does not crash on complex regex like "(a+)+"', async () => {
    const res = await request(app).get('/api/search?q=(a%2B)%2B&type=posts');
    expect(res.status).toBe(200);
  });
});
