/**
 * tests/controllers/post.test.js
 *
 * Integration tests for Post endpoints.
 * Covers: global feed, following feed, voting, pagination count fix.
 */
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret';

const request = require('supertest');
const { startTestServer, stopTestServer, clearCollections, buildApp } = require('../setup/testApp');
const User = require('../../src/models/User');
const Hub = require('../../src/models/Hub');
const Post = require('../../src/models/Post');

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

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createUserAndLogin(agent, overrides = {}) {
  const payload = {
    username: 'postuser',
    email: 'post@example.com',
    password: 'Password123!',
    ...overrides,
  };
  await agent.post('/api/auth/register').send(payload);
  return payload;
}

async function seedPostsForUser(userId, hubId, count = 3) {
  const posts = [];
  for (let i = 0; i < count; i++) {
    posts.push({
      title: `Post number ${i + 1}`,
      content: `Content for post ${i + 1}`,
      author: userId,
      hub: hubId,
    });
  }
  return Post.insertMany(posts);
}

// ─── GET /api/posts (global feed) ───────────────────────────────────────────

describe('GET /api/posts — global feed', () => {
  let hubId;
  let userId;

  beforeEach(async () => {
    const user = await User.create({
      username: 'seeduser',
      email: 'seed@example.com',
      password: 'Password123!',
    });
    userId = user._id;

    const hub = await Hub.create({
      name: 'Test Hub',
      game: 'Test Game',
      creator: userId,
      moderators: [userId],
      members: [userId],
      slug: 'test-hub',
    });
    hubId = hub._id;

    await seedPostsForUser(userId, hubId, 3);
  });

  test('returns 200 with paginated posts array', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.posts)).toBe(true);
    expect(res.body.data.posts.length).toBe(3);
  });

  test('returns meta pagination object', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 20,
    });
    expect(res.body.meta.total).toBe(3);
  });

  test('populates author username and hub name', async () => {
    const res = await request(app).get('/api/posts');
    const post = res.body.data.posts[0];
    expect(post.author).toMatchObject({ username: 'seeduser' });
    expect(post.hub).toMatchObject({ name: 'Test Hub' });
  });

  test('sorts by new (createdAt desc) by default', async () => {
    const res = await request(app).get('/api/posts?sort=new');
    const posts = res.body.data.posts;
    // Verify posts are returned in descending createdAt order
    const dates = posts.map(p => new Date(p.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
    }
  });

  test('accepts sort=hot query param without error', async () => {
    const res = await request(app).get('/api/posts?sort=hot');
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/posts?filter=following ────────────────────────────────────────

describe('GET /api/posts — following filter', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/posts?filter=following');
    expect(res.status).toBe(401);
  });

  test('returns only posts from followed users', async () => {
    const userA = await User.create({
      username: 'userA',
      email: 'a@example.com',
      password: 'Password123!',
    });
    const userB = await User.create({
      username: 'userB',
      email: 'b@example.com',
      password: 'Password123!',
    });
    const userC = await User.create({
      username: 'userC',
      email: 'c@example.com',
      password: 'Password123!',
    });

    const hub = await Hub.create({
      name: 'Follow Hub',
      game: 'Test',
      creator: userA._id,
      moderators: [userA._id],
      members: [userA._id, userB._id, userC._id],
      slug: 'follow-hub',
    });

    // userA follows userB only
    await User.findByIdAndUpdate(userA._id, { $addToSet: { following: userB._id } });
    await User.findByIdAndUpdate(userB._id, { $addToSet: { followers: userA._id } });

    // userB posts something, userC posts something
    await Post.create({ title: 'UserB Post', content: 'by B', author: userB._id, hub: hub._id });
    await Post.create({ title: 'UserC Post', content: 'by C', author: userC._id, hub: hub._id });

    // Login as userA
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'a@example.com', password: 'Password123!' });

    const res = await agent.get('/api/posts?filter=following');
    expect(res.status).toBe(200);

    const titles = res.body.data.posts.map(p => p.title);
    expect(titles).toContain('UserB Post');
    expect(titles).not.toContain('UserC Post');
  });

  test('pagination meta total reflects the following filter, not global count', async () => {
    const userA = await User.create({ username: 'pagA', email: 'paga@example.com', password: 'Password123!' });
    const userB = await User.create({ username: 'pagB', email: 'pagb@example.com', password: 'Password123!' });
    const hub = await Hub.create({
      name: 'Pag Hub', game: 'Test', creator: userA._id,
      moderators: [userA._id], members: [userA._id, userB._id], slug: 'pag-hub',
    });

    // userA follows userB
    await User.findByIdAndUpdate(userA._id, { following: [userB._id] });

    // Create 2 posts by userB, 5 posts by userA (not followed by themselves)
    for (let i = 0; i < 2; i++) {
      await Post.create({ title: `B post ${i}`, content: 'x', author: userB._id, hub: hub._id });
    }
    for (let i = 0; i < 5; i++) {
      await Post.create({ title: `A post ${i}`, content: 'x', author: userA._id, hub: hub._id });
    }

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'paga@example.com', password: 'Password123!' });

    const res = await agent.get('/api/posts?filter=following');
    expect(res.status).toBe(200);
    // Only 2 posts from userB should be in the count
    expect(res.body.meta.total).toBe(2);
  });
});

// ─── POST /api/posts/:postId/vote ────────────────────────────────────────────

describe('POST /api/posts/:postId/vote', () => {
  let agent;
  let postId;

  beforeEach(async () => {
    agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      username: 'voter',
      email: 'voter@example.com',
      password: 'Password123!',
    });

    const user = await User.findOne({ username: 'voter' });
    const hub = await Hub.create({
      name: 'Vote Hub', game: 'Test', creator: user._id,
      moderators: [user._id], members: [user._id], slug: 'vote-hub',
    });
    const post = await Post.create({ title: 'Votable Post', content: 'x', author: user._id, hub: hub._id });
    postId = post._id.toString();
  });

  test('returns 401 when not logged in', async () => {
    const res = await request(app).post(`/api/posts/${postId}/vote`).send({ value: 1 });
    expect(res.status).toBe(401);
  });

  test('upvote increments voteScore by 1', async () => {
    const res = await agent.post(`/api/posts/${postId}/vote`).send({ value: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.voteScore).toBe(1);
    expect(res.body.data.userVote).toBe(1);
  });

  test('downvote decrements voteScore by 1', async () => {
    const res = await agent.post(`/api/posts/${postId}/vote`).send({ value: -1 });
    expect(res.status).toBe(200);
    expect(res.body.data.voteScore).toBe(-1);
    expect(res.body.data.userVote).toBe(-1);
  });

  test('voting same value twice cancels the vote (toggle)', async () => {
    await agent.post(`/api/posts/${postId}/vote`).send({ value: 1 });
    const res = await agent.post(`/api/posts/${postId}/vote`).send({ value: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.voteScore).toBe(0);
    expect(res.body.data.userVote).toBe(0);
  });

  test('switching from upvote to downvote changes score by 2', async () => {
    await agent.post(`/api/posts/${postId}/vote`).send({ value: 1 });
    const res = await agent.post(`/api/posts/${postId}/vote`).send({ value: -1 });
    expect(res.status).toBe(200);
    expect(res.body.data.voteScore).toBe(-1);
    expect(res.body.data.userVote).toBe(-1);
  });

  test('rejects invalid vote value 0', async () => {
    const res = await agent.post(`/api/posts/${postId}/vote`).send({ value: 0 });
    expect(res.status).toBe(400);
  });

  test('rejects invalid vote value 2', async () => {
    const res = await agent.post(`/api/posts/${postId}/vote`).send({ value: 2 });
    expect(res.status).toBe(400);
  });
});
