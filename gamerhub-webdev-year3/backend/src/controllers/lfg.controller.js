const Post = require('../models/Post');
const Hub = require('../models/Hub');
const { success, error } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const PAGE_SIZE = 20;

/**
 * @param {string} [opts.skillLevel] - Filter by skill level
 * @param {string} [opts.status]     - Filter by status
 * @param {string} [opts.region]     - Filter by region
 * @param {boolean} [opts.voiceChat]  - Filter by voice chat requirements
 * @param {string} [opts.gameMode]   - Filter by game mode
 * @returns {object} Mongoose query filter
 */
const buildFilter = ({ hubId, platform, skillLevel, status, region, voiceChat, gameMode }) => {
  const filter = { type: 'lfg' };
  if (hubId) filter.hub = hubId;
  if (status) filter['lfgDetails.status'] = status;
  if (platform) filter['lfgDetails.platform'] = platform;
  if (skillLevel) filter['lfgDetails.skillLevel'] = skillLevel;
  if (region) filter['lfgDetails.region'] = region;
  if (voiceChat !== undefined) filter['lfgDetails.voiceChat'] = voiceChat === 'true' || voiceChat === true;
  if (gameMode) filter['lfgDetails.gameMode'] = { $regex: gameMode, $options: 'i' };
  return filter;
};

/**
 * @desc    Global LFG feed across all hubs
 * @route   GET /api/lfg
 * @access  Public
 */
const getGlobalLFG = asyncHandler(async (req, res) => {
  const { page = 1, game, platform, skillLevel, status = 'open' } = req.query;

  let hubFilter = {};
  if (game) {
    // In search, using text search is better. 
    // For now keeping simple regex but optimized with Hub.find.
    const hubs = await Hub.find({ game: { $regex: game, $options: 'i' } }).select('_id');
    hubFilter = { hub: { $in: hubs.map((h) => h._id) } };
  }

  const filter = { ...buildFilter({ platform, skillLevel, status }), ...hubFilter };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate('author', 'username avatar')
      .populate('hub', 'name slug icon game')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Post.countDocuments(filter),
  ]);

  return success(res, { posts }, 200, {
    page: Number(page),
    limit: PAGE_SIZE,
    total,
    pages: Math.ceil(total / PAGE_SIZE),
  });
});

/**
 * @desc    LFG posts scoped to a specific hub
 * @route   GET /api/hubs/:hubId/lfg
 * @access  Public
 */
const getHubLFG = asyncHandler(async (req, res) => {
  const { page = 1, platform, skillLevel, status = 'open' } = req.query;

  const hub = await Hub.findById(req.params.hubId);
  if (!hub) return error(res, 'Hub not found.', 404);

  const filter = buildFilter({ hubId: hub._id, platform, skillLevel, status });

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Post.countDocuments(filter),
  ]);

  return success(res, { posts }, 200, {
    page: Number(page),
    limit: PAGE_SIZE,
    total,
    pages: Math.ceil(total / PAGE_SIZE),
  });
});

/**
 * @desc    Open or close an LFG post
 * @route   PATCH /api/lfg/:postId/status
 * @access  Private
 */
const updateLFGStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['open', 'closed'].includes(status)) {
    return error(res, 'Status must be "open" or "closed".', 400);
  }

  const post = await Post.findById(req.params.postId);
  if (!post) return error(res, 'Post not found.', 404);
  if (post.type !== 'lfg') return error(res, 'Post is not an LFG post.', 400);
  if (post.author.toString() !== req.user._id.toString()) {
    return error(res, 'Not authorised.', 403);
  }

  post.lfgDetails.status = status;
  await post.save();
  return success(res, { post });
});

module.exports = { getGlobalLFG, getHubLFG, updateLFGStatus };
