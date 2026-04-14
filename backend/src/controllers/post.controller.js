const Post = require('../models/Post');
const Hub = require('../models/Hub');
const EngagementService = require('../services/EngagementService');
const { success, error } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const PAGE_SIZE = 20;

/**
 * @desc    Get paginated posts for a hub with sort and type filtering
 * @route   GET /api/hubs/:hubId/posts
 * @access  Public
 */
const getHubPosts = asyncHandler(async (req, res) => {
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

  let data = posts;
  if (req.user) {
    data = await EngagementService.attachUserVotes(posts, req.user._id, 'Post');
  }

  return success(res, { posts: data }, 200, meta);
});

/**
 * @desc    Create a new post in a hub
 * @route   POST /api/hubs/:hubId/posts
 * @access  Private
 */
const createPost = asyncHandler(async (req, res) => {
  const hub = await Hub.findById(req.params.hubId);
  if (!hub) return error(res, 'Hub not found.', 404);

  const { title, content, type, url, tags, flair, lfgDetails } = req.body;
  const resolvedUrl = req.file ? req.file.path : (url || '');
  console.log('[Create Post] req.body.url:', url, '| req.file:', req.file, '| Final URL:', resolvedUrl);
  const postData = {
    title,
    content,
    type: type || 'text',
    url: resolvedUrl,
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
});

/**
 * @desc    Get a single post by ID
 * @route   GET /api/posts/:postId
 * @access  Public
 */
const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId)
    .populate('author', 'username avatar bio')
    .populate('hub', 'name slug icon game');
  if (!post) return error(res, 'Post not found.', 404);

  let userVote = 0;
  if (req.user) {
    const vote = await EngagementService.attachUserVotes([post], req.user._id, 'Post');
    userVote = vote[0].userVote;
  }

  return success(res, { post: { ...post.toJSON(), userVote } });
});

/**
 * @desc    Edit a post's content
 * @route   PUT /api/posts/:postId
 * @access  Private
 */
const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return error(res, 'Post not found.', 404);
  
  if (post.author.toString() !== req.user._id.toString()) {
    return error(res, 'Not authorised to edit this post.', 403);
  }
  
  if (post.isLocked) return error(res, 'Post is locked.', 403);

  const editable = ['title', 'content', 'url', 'tags', 'flair'];
  editable.forEach((f) => { 
    if (req.body[f] !== undefined) post[f] = req.body[f]; 
  });
  
  if (req.body.lfgDetails !== undefined && post.type === 'lfg') {
    post.lfgDetails = req.body.lfgDetails;
  }

  await post.save();
  return success(res, { post });
});

/**
 * @desc    Delete a post and cascade-delete its comments and votes
 * @route   DELETE /api/posts/:postId
 * @access  Private
 */
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return error(res, 'Post not found.', 404);

  const hub = await Hub.findById(post.hub);
  const isAuthor = post.author.toString() === req.user._id.toString();
  const isMod = hub?.moderators.some((m) => m.toString() === req.user._id.toString());

  if (!isAuthor && !isMod && req.user.role !== 'admin') {
    return error(res, 'Not authorised to delete this post.', 403);
  }

  await EngagementService.deletePostCascade(post._id);

  return success(res, { message: 'Post deleted.' });
});

/**
 * @desc    Vote on a post
 * @route   POST /api/posts/:postId/vote
 * @access  Private
 */
const votePost = asyncHandler(async (req, res) => {
  const { value } = req.body;
  if (![1, -1].includes(Number(value))) {
    return error(res, 'Vote value must be 1 (upvote) or -1 (downvote).', 400);
  }

  const result = await EngagementService.handleVote(req.params.postId, req.user._id, 'Post', Number(value));
  return success(res, result);
});

module.exports = { getHubPosts, createPost, getPost, updatePost, deletePost, votePost };
