const Post = require('../models/Post');
const User = require('../models/User');
const Hub = require('../models/Hub');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');

/**
 * @desc    Global search across Hubs, Posts, and Users
 * @route   GET /api/search
 * @access  Public
 */
const globalSearch = asyncHandler(async (req, res) => {
  const { q, type = 'all', page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  if (!q) {
    return success(res, { hubs: [], posts: [], users: [] });
  }

  const regex = new RegExp(escapeRegex(q), 'i');

  const hubFilter  = { name: regex };
  const postFilter  = { title: regex };
  const userFilter  = { username: regex };

  const results = {};

  if (type === 'all' || type === 'hubs') {
    results.hubs = await Hub.find(hubFilter)
      .sort({ memberCount: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();
  }

  if (type === 'all' || type === 'posts') {
    results.posts = await Post.find(postFilter)
      .populate('author', 'username avatar')
      .populate('hub', 'name slug icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();
  }

  if (type === 'all' || type === 'users') {
    results.users = await User.find(userFilter)
      .select('username avatar bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();
  }

  return success(res, results);
});

module.exports = { globalSearch };
