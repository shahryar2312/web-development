const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { success, error } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const PAGE_SIZE = 20;

/**
 * @desc    Get a user's public profile by username
 * @route   GET /api/users/:username
 * @access  Public
 */
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username }).populate(
    'joinedHubs',
    'name slug icon game memberCount'
  );
  if (!user) return error(res, 'User not found.', 404);
  return success(res, { user });
});

/**
 * @desc    Update the authenticated user's bio and/or avatar URL
 * @route   PUT /api/users/me
 * @access  Private
 */
const updateMe = asyncHandler(async (req, res) => {
  const updates = {};
  if (req.body.bio !== undefined) updates.bio = req.body.bio;
  if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });
  return success(res, { user });
});

/**
 * @desc    Change the authenticated user's password
 * @route   PUT /api/users/me/password
 * @access  Private
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return error(res, 'Current password is incorrect.', 401);
  }

  user.password = newPassword;
  await user.save();
  return success(res, { message: 'Password updated successfully.' });
});

/**
 * @desc    Get all posts authored by a given user
 * @route   GET /api/users/:username/posts
 * @access  Public
 */
const getUserPosts = asyncHandler(async (req, res) => {
  const { page = 1 } = req.query;
  const target = await User.findOne({ username: req.params.username });
  if (!target) return error(res, 'User not found.', 404);

  const [posts, total] = await Promise.all([
    Post.find({ author: target._id })
      .populate('author', 'username avatar')
      .populate('hub', 'name slug icon')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Post.countDocuments({ author: target._id }),
  ]);

  return success(res, { posts }, 200, {
    page: Number(page),
    limit: PAGE_SIZE,
    total,
    pages: Math.ceil(total / PAGE_SIZE),
  });
});

/**
 * @desc    Get all non-deleted comments authored by a given user
 * @route   GET /api/users/:username/comments
 * @access  Public
 */
const getUserComments = asyncHandler(async (req, res) => {
  const { page = 1 } = req.query;
  const target = await User.findOne({ username: req.params.username });
  if (!target) return error(res, 'User not found.', 404);

  const filter = { author: target._id, isDeleted: false };
  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .populate('author', 'username avatar')
      .populate({ path: 'post', select: 'title hub' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Comment.countDocuments(filter),
  ]);

  return success(res, { comments }, 200, {
    page: Number(page),
    limit: PAGE_SIZE,
    total,
    pages: Math.ceil(total / PAGE_SIZE),
  });
});

/**
 * @desc    Get all users (admin only, paginated)
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1 } = req.query;
  const [users, total] = await Promise.all([
    User.find()
      .select('-refreshToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    User.countDocuments(),
  ]);

  return success(res, { users }, 200, {
    page: Number(page),
    limit: PAGE_SIZE,
    total,
    pages: Math.ceil(total / PAGE_SIZE),
  });
});

/**
 * @desc    Delete a user (admin only)
 * @route   DELETE /api/users/:userId
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return error(res, 'User not found.', 404);

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user._id.toString()) {
    return error(res, 'You cannot delete yourself.', 400);
  }

  await User.findByIdAndDelete(req.params.userId);
  return success(res, { message: 'User deleted successfully.' });
});

module.exports = { getUser, updateMe, updatePassword, getUserPosts, getUserComments, getAllUsers, deleteUser };
