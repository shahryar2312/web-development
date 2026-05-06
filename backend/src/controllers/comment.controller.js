const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Hub = require('../models/Hub');
const EngagementService = require('../services/EngagementService');
const NotificationService = require('../services/NotificationService');
const { success, error } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const PAGE_SIZE = 50;

/**
 * @desc    Get paginated comments for a post
 * @route   GET /api/posts/:postId/comments
 * @access  Public
 */
const getComments = asyncHandler(async (req, res) => {
  const { page = 1, sort = 'best', parentId = null, flat } = req.query;

  const post = await Post.findById(req.params.postId);
  if (!post) return error(res, 'Post not found.', 404);

  // 01.05 Ilia Klodin: needed flat mode so client can fetch all comments at once and build the tree itself for nesting
  const filter = { post: post._id };
  // flat=true returns all comments regardless of depth (used to build the full tree client-side)
  if (flat !== 'true') filter.parent = parentId || null;

  const sortMap = {
    best: { voteScore: -1, createdAt: -1 },
    new: { createdAt: -1 },
    old: { createdAt: 1 },
    controversial: { downvotes: -1 },
  };

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .populate('author', 'username avatar')
      .sort(sortMap[sort] || sortMap.best)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Comment.countDocuments(filter),
  ]);

  const meta = { page: Number(page), limit: PAGE_SIZE, total, pages: Math.ceil(total / PAGE_SIZE) };

  let data = comments;
  if (req.user) {
    data = await EngagementService.attachUserVotes(comments, req.user._id, 'Comment');
  }

  return success(res, { comments: data }, 200, meta);
});

/**
 * @desc    Post a new comment or a threaded reply
 * @route   POST /api/posts/:postId/comments
 * @access  Private
 */
const createComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return error(res, 'Post not found.', 404);
  
  if (post.isLocked) {
    return error(res, 'Post is locked. No new comments allowed.', 403);
  }

  // 23.04 Ilia Klodin - adding adming functionality - before commenting check if the user is banned from the hub
  const hub = await Hub.findById(post.hub);
  if (hub?.bannedUsers.some((u) => u.toString() === req.user._id.toString())) {
    return error(res, 'You are banned from this hub.', 403);
  }

  const { content, parentId } = req.body;

  let depth = 0;
  if (parentId) {
    const parent = await Comment.findById(parentId);
    if (!parent) return error(res, 'Parent comment not found.', 404);
    if (parent.post.toString() !== post._id.toString()) {
      return error(res, 'Parent comment does not belong to this post.', 400);
    }
    // Cap nesting at depth 10
    depth = Math.min(parent.depth + 1, 10);
  }

  const comment = await Comment.create({
    content,
    author: req.user._id,
    post: post._id,
    parent: parentId || null,
    depth,
  });

  await comment.populate('author', 'username avatar');

  // Atomic counters
  await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });
  
  let recipientId = post.author;
  if (parentId) {
    const parent = await Comment.findById(parentId);
    recipientId = parent.author;
    await Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
  }

  // Trigger notification
  NotificationService.createNotification({
    recipient: recipientId,
    sender: req.user._id,
    type: 'reply',
    post: post._id,
    comment: comment._id,
  }).catch(err => console.error('Notification Error:', err.message));

  return success(res, { comment }, 201);
});

/**
 * @desc    Edit a comment's content
 * @route   PUT /api/comments/:commentId
 * @access  Private
 */
const updateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return error(res, 'Comment not found.', 404);
  
  if (comment.isDeleted) {
    return error(res, 'Cannot edit a deleted comment.', 400);
  }
  
  if (comment.author.toString() !== req.user._id.toString()) {
    return error(res, 'Not authorised to edit this comment.', 403);
  }

  comment.content = req.body.content;
  await comment.save();
  return success(res, { comment });
});

/**
 * @desc    Soft-delete a comment
 * @route   DELETE /api/comments/:commentId
 * @access  Private
 */
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId).populate('post');
  if (!comment) return error(res, 'Comment not found.', 404);

  const isAuthor = comment.author.toString() === req.user._id.toString();
  const hub = await Hub.findById(comment.post?.hub);
  const isMod = hub?.moderators.some((m) => m.toString() === req.user._id.toString());

  if (!isAuthor && !isMod && req.user.role !== 'admin') {
    return error(res, 'Not authorised to delete this comment.', 403);
  }

  comment.isDeleted = true;
  comment.deletedAt = new Date();
  await comment.save();

  // Technically count goes down, but document stays
  await Post.findByIdAndUpdate(comment.post._id, { $inc: { commentCount: -1 } });

  return success(res, { message: 'Comment deleted.' });
});

/**
 * @desc    Vote on a comment
 * @route   POST /api/comments/:commentId/vote
 * @access  Private
 */
const voteComment = asyncHandler(async (req, res) => {
  const { value } = req.body;
  if (![1, -1].includes(Number(value))) {
    return error(res, 'Vote value must be 1 or -1.', 400);
  }

  const result = await EngagementService.handleVote(
    req.params.commentId, 
    req.user._id, 
    'Comment', 
    Number(value)
  );
  
  return success(res, result);
});

module.exports = { getComments, createComment, updateComment, deleteComment, voteComment };
