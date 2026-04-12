const { validationResult } = require('express-validator');
const Hub = require('../models/Hub');
const User = require('../models/User');
const { success, error } = require('../utils/apiResponse');

const PAGE_SIZE = 20;

/**
 * @desc    List all hubs with optional text search (name/game) and sort order
 * @route   GET /api/hubs
 * @access  Public
 */
const getHubs = async (req, res, next) => {
  try {
    const { page = 1, search, sort = 'popular' } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { game: { $regex: search, $options: 'i' } },
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
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new hub; creator is automatically set as member and moderator
 * @route   POST /api/hubs
 * @access  Private
 */
const createHub = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'Validation failed', 400, errs.array());

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
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get a single hub by ID, including creator and moderator details
 * @route   GET /api/hubs/:hubId
 * @access  Public
 */
const getHub = async (req, res, next) => {
  try {
    const hub = await Hub.findById(req.params.hubId)
      .populate('creator', 'username avatar')
      .populate('moderators', 'username avatar');
    if (!hub) return error(res, 'Hub not found.', 404);
    return success(res, { hub });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update hub settings — description, icon, banner, rules, privacy (mod/creator/admin only)
 * @route   PUT /api/hubs/:hubId
 * @access  Private
 */
const updateHub = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'Validation failed', 400, errs.array());

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
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Permanently delete a hub (creator or admin only)
 * @route   DELETE /api/hubs/:hubId
 * @access  Private
 */
const deleteHub = async (req, res, next) => {
  try {
    const hub = await Hub.findById(req.params.hubId);
    if (!hub) return error(res, 'Hub not found.', 404);

    if (hub.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return error(res, 'Only the hub creator can delete it.', 403);
    }

    await Hub.findByIdAndDelete(req.params.hubId);
    return success(res, { message: 'Hub deleted.' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Join a hub as a member
 * @route   POST /api/hubs/:hubId/join
 * @access  Private
 */
const joinHub = async (req, res, next) => {
  try {
    const hub = await Hub.findById(req.params.hubId);
    if (!hub) return error(res, 'Hub not found.', 404);

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
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Leave a hub (hub creator cannot leave — they must delete the hub instead)
 * @route   DELETE /api/hubs/:hubId/join
 * @access  Private
 */
const leaveHub = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get a paginated list of hub members
 * @route   GET /api/hubs/:hubId/members
 * @access  Public
 */
const getHubMembers = async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getHubs,
  createHub,
  getHub,
  updateHub,
  deleteHub,
  joinHub,
  leaveHub,
  getHubMembers,
};
