const { validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Hub = require('../models/Hub');
const Vote = require('../models/Vote');
const { success, error } = require('../utils/apiResponse');

const PAGE_SIZE = 50;

/**
 * @desc    Get paginated comments for a post; parentId=null returns top-level, otherwise returns replies
 * @route   GET /api/posts/:postId/comments
 * @access  Public (optional auth attaches the user's vote state to each comment)
 */
const getComments = async (req, res, next) => {
  try {
    const { page = 1, sort = 'best', parentId = null } = req.query;

    const post = await Post.findById(req.params.postId);
    if (!post) return error(res, 'Post not found.', 404);

    // parentId=null → top-level; otherwise children of that comment
    const filter = { post: post._id, parent: parentId || null };

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

    if (req.user) {
      const ids = comments.map((c) => c._id);
      const votes = await Vote.find({ user: req.user._id, targetId: { $in: ids }, targetModel: 'Comment' });
      const voteMap = {};
      votes.forEach((v) => { voteMap[v.targetId.toString()] = v.value; });
      const withVotes = comments.map((c) => ({ ...c.toJSON(), userVote: voteMap[c._id.toString()] || 0 }));
      return success(res, { comments: withVotes }, 200, meta);
    }

    return success(res, { comments }, 200, meta);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Post a new comment or a threaded reply on a post (depth capped at 10)
 * @route   POST /api/posts/:postId/comments
 * @access  Private
 */
const createComment = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'Validation failed', 400, errs.array());

    const post = await Post.findById(req.params.postId);
    if (!post) return error(res, 'Post not found.', 404);
    if (post.isLocked) return error(res, 'Post is locked. No new comments allowed.', 403);

    const { content, parentId } = req.body;

    let depth = 0;
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent) return error(res, 'Parent comment not found.', 404);
      if (parent.post.toString() !== post._id.toString()) {
        return error(res, 'Parent comment does not belong to this post.', 400);
      }
      // Cap nesting at depth 10 so the UI doesn't collapse infinitely
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

    // Keep denormalised counters in sync atomically
    await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });
    if (parentId) {
      await Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
    }

    return success(res, { comment }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Edit a comment's content (author only; cannot edit deleted comments)
 * @route   PUT /api/comments/:commentId
 * @access  Private
 */
const updateComment = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'Validation failed', 400, errs.array());

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return error(res, 'Comment not found.', 404);
    if (comment.isDeleted) return error(res, 'Cannot edit a deleted comment.', 400);
    if (comment.author.toString() !== req.user._id.toString()) {
      return error(res, 'Not authorised to edit this comment.', 403);
    }

    comment.content = req.body.content;
    await comment.save();
    return success(res, { comment });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Soft-delete a comment so threaded replies remain visible (author, hub mod, or admin)
 * @route   DELETE /api/comments/:commentId
 * @access  Private
 */
const deleteComment = async (req, res, next) => {
  try {
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

    await Post.findByIdAndUpdate(comment.post._id, { $inc: { commentCount: -1 } });

    return success(res, { message: 'Comment deleted.' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Vote on a comment: 1=upvote, -1=downvote, same value twice=toggle off, opposite=flip
 * @route   POST /api/comments/:commentId/vote
 * @access  Private
 */
const voteComment = async (req, res, next) => {
  try {
    const { value } = req.body;
    if (![1, -1].includes(Number(value))) {
      return error(res, 'Vote value must be 1 or -1.', 400);
    }
    const voteValue = Number(value);

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return error(res, 'Comment not found.', 404);
    if (comment.isDeleted) return error(res, 'Cannot vote on a deleted comment.', 400);

    const existing = await Vote.findOne({
      user: req.user._id,
      targetId: comment._id,
      targetModel: 'Comment',
    });

    let scoreDelta = 0;
    let upDelta = 0;
    let downDelta = 0;
    let newUserVote = 0;

    if (existing) {
      if (existing.value === voteValue) {
        await Vote.findByIdAndDelete(existing._id);
        scoreDelta = -voteValue;
        voteValue === 1 ? (upDelta = -1) : (downDelta = -1);
        newUserVote = 0;
      } else {
        existing.value = voteValue;
        await existing.save();
        scoreDelta = voteValue * 2;
        if (voteValue === 1) { upDelta = 1; downDelta = -1; }
        else { upDelta = -1; downDelta = 1; }
        newUserVote = voteValue;
      }
    } else {
      await Vote.create({ user: req.user._id, targetId: comment._id, targetModel: 'Comment', value: voteValue });
      scoreDelta = voteValue;
      voteValue === 1 ? (upDelta = 1) : (downDelta = 1);
      newUserVote = voteValue;
    }

    const updated = await Comment.findByIdAndUpdate(
      comment._id,
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

module.exports = { getComments, createComment, updateComment, deleteComment, voteComment };
