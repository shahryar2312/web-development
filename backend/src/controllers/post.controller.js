const { validationResult } = require('express-validator');
const Post = require('../models/Post');
const Hub = require('../models/Hub');
const Comment = require('../models/Comment');
const Vote = require('../models/Vote');
const { success, error } = require('../utils/apiResponse');

const PAGE_SIZE = 20;

/**
 * Batch-fetch the current user's vote on a list of posts in a single DB round-trip.
 * Spreads a `userVote` field (1, -1, or 0) onto each post object.
 * @param {import('mongoose').Document[]} posts
 * @param {string} userId
 * @returns {Promise<object[]>} Plain post objects with `userVote` attached
 */
const attachUserVotes = async (posts, userId) => {
  const ids = posts.map((p) => p._id);
  const votes = await Vote.find({ user: userId, targetId: { $in: ids }, targetModel: 'Post' });
  const map = {};
  votes.forEach((v) => { map[v.targetId.toString()] = v.value; });
  return posts.map((p) => ({ ...p.toJSON(), userVote: map[p._id.toString()] || 0 }));
};

/**
 * @desc    Get paginated posts for a hub with sort and type filtering
 * @route   GET /api/hubs/:hubId/posts
 * @access  Public (optional auth attaches the user's vote state to each post)
 */
const getHubPosts = async (req, res, next) => {
  try {
    const { page = 1, sort = 'new', type } = req.query;

    const hub = await Hub.findById(req.params.hubId);
    if (!hub) return error(res, 'Hub not found.', 404);

    const filter = { hub: hub._id };
    if (type) filter.type = type;

    const sortMap = {
      new: { createdAt: -1 },
      hot: { voteScore: -1, createdAt: -1 },
      top: { voteScore: -1 },
      old: { createdAt: 1 },
    };

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('author', 'username avatar')
        .populate('hub', 'name slug icon')
        .sort(sortMap[sort] || sortMap.new)
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      Post.countDocuments(filter),
    ]);

    const meta = { page: Number(page), limit: PAGE_SIZE, total, pages: Math.ceil(total / PAGE_SIZE) };

    if (req.user) {
      return success(res, { posts: await attachUserVotes(posts, req.user._id) }, 200, meta);
    }
    return success(res, { posts }, 200, meta);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new post in a hub (type=lfg attaches lfgDetails)
 * @route   POST /api/hubs/:hubId/posts
 * @access  Private
 */
const createPost = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'Validation failed', 400, errs.array());

    const hub = await Hub.findById(req.params.hubId);
    if (!hub) return error(res, 'Hub not found.', 404);

    const { title, content, type, url, tags, flair, lfgDetails } = req.body;

    const postData = {
      title,
      content,
      type: type || 'text',
      url: url || '',
      tags: tags || [],
      flair: flair || '',
      author: req.user._id,
      hub: hub._id,
    };

    if (type === 'lfg' && lfgDetails) {
      postData.lfgDetails = lfgDetails;
    }

    const post = await Post.create(postData);
    await post.populate('author', 'username avatar');

    return success(res, { post }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get a single post by ID with author and hub populated
 * @route   GET /api/posts/:postId
 * @access  Public (optional auth attaches the user's vote state)
 */
const getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username avatar bio')
      .populate('hub', 'name slug icon game');
    if (!post) return error(res, 'Post not found.', 404);

    let userVote = 0;
    if (req.user) {
      const vote = await Vote.findOne({
        user: req.user._id,
        targetId: post._id,
        targetModel: 'Post',
      });
      userVote = vote?.value || 0;
    }

    return success(res, { post: { ...post.toJSON(), userVote } });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Edit a post's content (author only; locked posts cannot be edited)
 * @route   PUT /api/posts/:postId
 * @access  Private
 */
const updatePost = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'Validation failed', 400, errs.array());

    const post = await Post.findById(req.params.postId);
    if (!post) return error(res, 'Post not found.', 404);
    if (post.author.toString() !== req.user._id.toString()) {
      return error(res, 'Not authorised to edit this post.', 403);
    }
    if (post.isLocked) return error(res, 'Post is locked.', 403);

    const editable = ['title', 'content', 'url', 'tags', 'flair'];
    editable.forEach((f) => { if (req.body[f] !== undefined) post[f] = req.body[f]; });
    if (req.body.lfgDetails !== undefined && post.type === 'lfg') {
      post.lfgDetails = req.body.lfgDetails;
    }

    await post.save();
    return success(res, { post });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a post and cascade-delete its comments and votes (author, hub mod, or admin)
 * @route   DELETE /api/posts/:postId
 * @access  Private
 */
const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return error(res, 'Post not found.', 404);

    const hub = await Hub.findById(post.hub);
    const isAuthor = post.author.toString() === req.user._id.toString();
    const isMod = hub?.moderators.some((m) => m.toString() === req.user._id.toString());

    if (!isAuthor && !isMod && req.user.role !== 'admin') {
      return error(res, 'Not authorised to delete this post.', 403);
    }

    // Remove the post along with its comments and votes in parallel
    await Promise.all([
      Post.findByIdAndDelete(post._id),
      Comment.deleteMany({ post: post._id }),
      Vote.deleteMany({ targetId: post._id, targetModel: 'Post' }),
    ]);

    return success(res, { message: 'Post deleted.' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Vote on a post: 1=upvote, -1=downvote, same value twice=toggle off, opposite=flip
 * @route   POST /api/posts/:postId/vote
 * @access  Private
 */
const votePost = async (req, res, next) => {
  try {
    const { value } = req.body;
    if (![1, -1].includes(Number(value))) {
      return error(res, 'Vote value must be 1 (upvote) or -1 (downvote).', 400);
    }
    const voteValue = Number(value);

    const post = await Post.findById(req.params.postId);
    if (!post) return error(res, 'Post not found.', 404);

    const existing = await Vote.findOne({
      user: req.user._id,
      targetId: post._id,
      targetModel: 'Post',
    });

    let scoreDelta = 0;
    let upDelta = 0;
    let downDelta = 0;
    let newUserVote = 0;

    if (existing) {
      if (existing.value === voteValue) {
        // Same direction → remove vote (toggle off)
        await Vote.findByIdAndDelete(existing._id);
        scoreDelta = -voteValue;
        voteValue === 1 ? (upDelta = -1) : (downDelta = -1);
        newUserVote = 0;
      } else {
        // Opposite direction → flip vote (counts as two-unit swing)
        existing.value = voteValue;
        await existing.save();
        scoreDelta = voteValue * 2;
        if (voteValue === 1) { upDelta = 1; downDelta = -1; }
        else { upDelta = -1; downDelta = 1; }
        newUserVote = voteValue;
      }
    } else {
      // New vote
      await Vote.create({ user: req.user._id, targetId: post._id, targetModel: 'Post', value: voteValue });
      scoreDelta = voteValue;
      voteValue === 1 ? (upDelta = 1) : (downDelta = 1);
      newUserVote = voteValue;
    }

    const updated = await Post.findByIdAndUpdate(
      post._id,
      { $inc: { voteScore: scoreDelta, upvotes: upDelta, downvotes: downDelta } },
      { new: true }
    );

    return success(res, {
      voteScore: updated.voteScore,
      upvotes: updated.upvotes,
      downvotes: updated.downvotes,
      userVote: newUserVote,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getHubPosts, createPost, getPost, updatePost, deletePost, votePost };
