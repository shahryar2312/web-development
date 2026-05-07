const Hub = require('../models/Hub');
const User = require('../models/User');
const { success, error } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { PAGE_SIZE } = require('../utils/constants');

/**
 * @desc    List all hubs with search (name/game) and sort order
 * @route   GET /api/hubs
 * @access  Public
 */
const getHubs = asyncHandler(async (req, res) => {
  const { page = 1, search, sort = 'popular' } = req.query;

  const filter = {};
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { name: regex },
      { game: regex },
    ];
  }

  const sortMap = {
    popular: { memberCount: -1 },
    new: { createdAt: -1 },
    name: { name: 1 },
  };

  const [hubs, total] = await Promise.all([
    Hub.find(filter)
      .populate('creator', 'username avatar')
      .sort(sortMap[sort] || sortMap.popular)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Hub.countDocuments(filter),
  ]);

  return success(res, { hubs }, 200, {
    page: Number(page),
    limit: PAGE_SIZE,
    total,
    pages: Math.ceil(total / PAGE_SIZE),
  });
});

/**
 * @desc    Create a new hub
 * @route   POST /api/hubs
 * @access  Private
 */
const createHub = asyncHandler(async (req, res) => {
  const { name, game, description, isPrivate } = req.body;

  const hub = await Hub.create({
    name,
    game,
    description,
    isPrivate,
    creator: req.user._id,
    moderators: [req.user._id],
    members: [req.user._id],
    memberCount: 1,
  });

  // Add hub to the creator's joined list
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { joinedHubs: hub._id } });

  return success(res, { hub }, 201);
});

/**
 * @desc    Get a single hub by ID
 * @route   GET /api/hubs/:hubId
 * @access  Public
 */
const getHub = asyncHandler(async (req, res) => {
  const hub = await Hub.findById(req.params.hubId)
    .populate('creator', 'username avatar')
    .populate('moderators', 'username avatar');
  if (!hub) return error(res, 'Hub not found.', 404);
  return success(res, { hub });
});

/**
 * 29.04 Ilia Klodin - added slug0based lookup for hubs to accomodate frontend routing
 * @desc    Get a single hub by slug
 * @route   GET /api/hubs/slug/:slug
 * @access  Public
 */
const getHubBySlug = asyncHandler(async (req, res) => {
  const hub = await Hub.findOne({ slug: req.params.slug })
    .populate('creator', 'username avatar')
    .populate('moderators', 'username avatar');
  if (!hub) return error(res, 'Hub not found.', 404);
  return success(res, { hub });
});

/**
 * @desc    Update hub settings
 * @route   PUT /api/hubs/:hubId
 * @access  Private
 */
const updateHub = asyncHandler(async (req, res) => {
  const hub = await Hub.findById(req.params.hubId);
  if (!hub) return error(res, 'Hub not found.', 404);

  const userId = req.user._id.toString();
  const isMod = hub.moderators.some((m) => m.toString() === userId);
  const isCreator = hub.creator.toString() === userId;

  if (!isMod && !isCreator && req.user.role !== 'admin') {
    return error(res, 'Not authorised to update this hub.', 403);
  }

  const allowed = ['description', 'icon', 'banner', 'rules', 'isPrivate'];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) hub[field] = req.body[field];
  });

  await hub.save();
  return success(res, { hub });
});

/**
 * @desc    Permanently delete a hub
 * @route   DELETE /api/hubs/:hubId
 * @access  Private
 */
const deleteHub = asyncHandler(async (req, res) => {
  const hub = await Hub.findById(req.params.hubId);
  if (!hub) return error(res, 'Hub not found.', 404);

  if (hub.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return error(res, 'Only the hub creator can delete it.', 403);
  }

  await Hub.findByIdAndDelete(req.params.hubId);
  return success(res, { message: 'Hub deleted.' });
});

/**
 * @desc    Join a hub as a member
 * @route   POST /api/hubs/:hubId/join
 * @access  Private
 */
const joinHub = asyncHandler(async (req, res) => {
  const hub = await Hub.findById(req.params.hubId);
  if (!hub) return error(res, 'Hub not found.', 404);

  // 23.04 Ilia Klodin - adding adming functionality - check if user is banned from the hub before allowing them to join
  if (hub.bannedUsers.some((u) => u.toString() === req.user._id.toString())) {
    return error(res, 'You are banned from this hub.', 403);
  }

  const alreadyMember = hub.members.some((m) => m.toString() === req.user._id.toString());
  if (alreadyMember) return error(res, 'Already a member of this hub.', 400);

  await Promise.all([
    Hub.findByIdAndUpdate(hub._id, {
      $addToSet: { members: req.user._id },
      $inc: { memberCount: 1 },
    }),
    User.findByIdAndUpdate(req.user._id, { $addToSet: { joinedHubs: hub._id } }),
  ]);

  return success(res, { message: 'Joined hub successfully.' });
});

/**
 * @desc    Leave a hub
 * @route   DELETE /api/hubs/:hubId/join
 * @access  Private
 */
const leaveHub = asyncHandler(async (req, res) => {
  const hub = await Hub.findById(req.params.hubId);
  if (!hub) return error(res, 'Hub not found.', 404);

  if (hub.creator.toString() === req.user._id.toString()) {
    return error(res, 'Hub creator cannot leave. Delete the hub instead.', 400);
  }

  const isMember = hub.members.some((m) => m.toString() === req.user._id.toString());
  if (!isMember) return error(res, 'Not a member of this hub.', 400);

  await Promise.all([
    Hub.findByIdAndUpdate(hub._id, {
      $pull: { members: req.user._id, moderators: req.user._id },
      $inc: { memberCount: -1 },
    }),
    User.findByIdAndUpdate(req.user._id, { $pull: { joinedHubs: hub._id } }),
  ]);

  return success(res, { message: 'Left hub successfully.' });
});

/**
 * @desc    Get a paginated list of hub members
 * @route   GET /api/hubs/:hubId/members
 * @access  Public
 */
const getHubMembers = asyncHandler(async (req, res) => {
  const { page = 1 } = req.query;
  const hub = await Hub.findById(req.params.hubId).populate({
    path: 'members',
    select: 'username avatar bio createdAt',
    options: {
      skip: (Number(page) - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    },
  });
  if (!hub) return error(res, 'Hub not found.', 404);

  return success(res, { members: hub.members }, 200, {
    page: Number(page),
    limit: PAGE_SIZE,
    total: hub.memberCount,
    pages: Math.ceil(hub.memberCount / PAGE_SIZE),
  });
});

/**
 * 21.04 Ilia Klodin: added mod/admin functionality
 * @desc    Add a user as a hub moderator
 * @route   POST /api/hubs/:hubId/moderators/:userId
 * @access  Private — hub creator or admin
 */
const addModerator = asyncHandler(async (req, res) => {
  const hub = await Hub.findById(req.params.hubId);
  if (!hub) return error(res, 'Hub not found.', 404);

  const isCreator = hub.creator.toString() === req.user._id.toString();
  if (!isCreator && req.user.role !== 'admin') {
    return error(res, 'Only the hub creator or an admin can add moderators.', 403);
  }

  const target = await User.findById(req.params.userId);
  if (!target) return error(res, 'User not found.', 404);

  if (hub.moderators.some((m) => m.toString() === req.params.userId)) {
    return error(res, 'User is already a moderator of this hub.', 400);
  }

  await Hub.findByIdAndUpdate(hub._id, { $addToSet: { moderators: target._id } });

  return success(res, { message: `${target.username} added as a moderator.` });
});

/**
 * 21.04 Ilia Klodin: added mod/admin functionality
 * @desc    Remove a hub moderator
 * @route   DELETE /api/hubs/:hubId/moderators/:userId
 * @access  Private — hub creator or admin
 */
const removeModerator = asyncHandler(async (req, res) => {
  const hub = await Hub.findById(req.params.hubId);
  if (!hub) return error(res, 'Hub not found.', 404);

  const isCreator = hub.creator.toString() === req.user._id.toString();
  if (!isCreator && req.user.role !== 'admin') {
    return error(res, 'Only the hub creator or an admin can remove moderators.', 403);
  }

  if (hub.creator.toString() === req.params.userId) {
    return error(res, 'Cannot remove the hub creator from moderators.', 400);
  }

  if (!hub.moderators.some((m) => m.toString() === req.params.userId)) {
    return error(res, 'User is not a moderator of this hub.', 400);
  }

  await Hub.findByIdAndUpdate(hub._id, { $pull: { moderators: req.params.userId } });

  return success(res, { message: 'Moderator removed.' });
});

/**
 * 22.04 Ilia Klodin- added hub-specific mod privileges.
 * @desc    Ban a user from a hub (removes them from members and moderators)
 * @route   POST /api/hubs/:hubId/ban/:userId
 * @access  Private — hub creator, hub mod, or admin
 */
const hubBanUser = asyncHandler(async (req, res) => {
  const hub = await Hub.findById(req.params.hubId);
  if (!hub) return error(res, 'Hub not found.', 404);

  const isCreator = hub.creator.toString() === req.user._id.toString();
  const isMod = hub.moderators.some((m) => m.toString() === req.user._id.toString());
  if (!isCreator && !isMod && req.user.role !== 'admin') {
    return error(res, 'Not authorised to ban users from this hub.', 403);
  }

  if (hub.creator.toString() === req.params.userId) {
    return error(res, 'Cannot ban the hub creator.', 400);
  }

  if (req.params.userId === req.user._id.toString()) {
    return error(res, 'You cannot ban yourself from a hub.', 400);
  }

  const target = await User.findById(req.params.userId);
  if (!target) return error(res, 'User not found.', 404);

  if (hub.bannedUsers.some((u) => u.toString() === req.params.userId)) {
    return error(res, 'User is already banned from this hub.', 400);
  }

  const isMember = hub.members.some((m) => m.toString() === req.params.userId);
  const update = {
    $addToSet: { bannedUsers: target._id },
    $pull: { members: target._id, moderators: target._id },
  };
  if (isMember) update.$inc = { memberCount: -1 };

  await Hub.findByIdAndUpdate(hub._id, update);
  if (isMember) {
    await User.findByIdAndUpdate(target._id, { $pull: { joinedHubs: hub._id } });
  }

  return success(res, { message: `${target.username} has been banned from this hub.` });
});

/**
 * 22.04 Ilia Klodin - added hub-specific mod privileges
 * @desc    Unban a user from a hub
 * @route   DELETE /api/hubs/:hubId/ban/:userId
 * @access  Private — hub creator, hub mod, or admin
 */
const hubUnbanUser = asyncHandler(async (req, res) => {
  const hub = await Hub.findById(req.params.hubId);
  if (!hub) return error(res, 'Hub not found.', 404);

  const isCreator = hub.creator.toString() === req.user._id.toString();
  const isMod = hub.moderators.some((m) => m.toString() === req.user._id.toString());
  if (!isCreator && !isMod && req.user.role !== 'admin') {
    return error(res, 'Not authorised to unban users from this hub.', 403);
  }

  if (!hub.bannedUsers.some((u) => u.toString() === req.params.userId)) {
    return error(res, 'User is not banned from this hub.', 400);
  }

  await Hub.findByIdAndUpdate(hub._id, { $pull: { bannedUsers: req.params.userId } });

  return success(res, { message: 'User has been unbanned from this hub.' });
});

module.exports = {
  getHubs,
  createHub,
  getHub,
  getHubBySlug,
  updateHub,
  deleteHub,
  joinHub,
  leaveHub,
  getHubMembers,
  addModerator,
  removeModerator,
  hubBanUser,
  hubUnbanUser,
};
