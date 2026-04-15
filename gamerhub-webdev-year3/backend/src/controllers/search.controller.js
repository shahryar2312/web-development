const Post = require('../models/Post');
const User = require('../models/User');
const Hub = require('../models/Hub');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

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

  const searchFilter = { $text: { $search: q } };
  const projection = { score: { $meta: 'textScore' } };
  const sort = { score: { $meta: 'textScore' } };

  const results = {};

  if (type === 'all' || type === 'hubs') {
    results.hubs = await Hub.find(searchFilter, projection)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();
  }

  if (type === 'all' || type === 'posts') {
    results.posts = await Post.find(searchFilter, projection)
      .populate('author', 'username avatar')
      .populate('hub', 'name slug icon')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();
  }

  if (type === 'all' || type === 'users') {
    results.users = await User.find(searchFilter, projection)
      .select('username avatar bio')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();
  }

  return success(res, results);
});

module.exports = { globalSearch };
