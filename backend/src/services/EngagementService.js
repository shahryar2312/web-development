const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Vote = require('../models/Vote');
const NotificationService = require('./NotificationService');

class EngagementService {
  /**
   * Batch-fetch the current user's vote on a list of targets (Posts or Comments).
   */
  static async attachUserVotes(items, userId, targetModel) {
    if (!userId || items.length === 0) return items;
    
    const ids = items.map((i) => i._id);
    const votes = await Vote.find({ 
      user: userId, 
      targetId: { $in: ids }, 
      targetModel 
    });
    
    const map = {};
    votes.forEach((v) => { 
      map[v.targetId.toString()] = v.value; 
    });
    
    return items.map((i) => ({ 
      ...i.toJSON(), 
      userVote: map[i._id.toString()] || 0 
    }));
  }

  /**
   * Generic voting logic for both Posts and Comments.
   */
  static async handleVote(targetId, userId, targetModel, voteValue) {
    const Model = targetModel === 'Post' ? Post : Comment;
    const item = await Model.findById(targetId);
    if (!item) throw new Error(`${targetModel} not found`);
    if (targetModel === 'Comment' && item.isDeleted) throw new Error('Cannot vote on a deleted comment');

    const existing = await Vote.findOne({
      user: userId,
      targetId: item._id,
      targetModel,
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
      await Vote.create({ user: userId, targetId: item._id, targetModel, value: voteValue });
      scoreDelta = voteValue;
      voteValue === 1 ? (upDelta = 1) : (downDelta = 1);
      newUserVote = voteValue;
    }

    const updated = await Model.findByIdAndUpdate(
      item._id,
      { $inc: { voteScore: scoreDelta, upvotes: upDelta, downvotes: downDelta } },
      { new: true }
    );

    // Trigger notification for new upvotes
    if (newUserVote === 1) {
      NotificationService.createNotification({
        recipient: item.author,
        sender: userId,
        type: targetModel === 'Post' ? 'upvote_post' : 'upvote_comment',
        post: targetModel === 'Post' ? item._id : item.post,
        comment: targetModel === 'Comment' ? item._id : undefined,
      }).catch(err => console.error('Notification Error:', err.message));
    }

    return {
      voteScore: updated.voteScore,
      upvotes: updated.upvotes,
      downvotes: updated.downvotes,
      userVote: newUserVote,
    };
  }

  /**
   * Cascade-delete a post and its associated comments/votes.
   */
  static async deletePostCascade(postId) {
    await Promise.all([
      Post.findByIdAndDelete(postId),
      Comment.deleteMany({ post: postId }),
      Vote.deleteMany({ targetId: postId, targetModel: 'Post' }),
    ]);
  }
}

module.exports = EngagementService;
