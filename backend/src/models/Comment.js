const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [10000, 'Comment cannot exceed 10000 characters'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    // null  → top-level comment
    // ObjectId → reply to that comment
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    // Depth is tracked so we can cap nesting and render indentation without
    // recursive DB queries on every render.
    depth: { type: Number, default: 0, min: 0, max: 10 },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    voteScore: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    // Soft delete: the document stays so nested replies remain visible.
    // Content is replaced with '[deleted]' in toJSON().
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, parent: 1, createdAt: 1 });  // thread fetch
commentSchema.index({ post: 1, voteScore: -1 });            // best sort
commentSchema.index({ author: 1, createdAt: -1 });          // user comment history

commentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  if (obj.isDeleted) {
    obj.content = '[deleted]';
    delete obj.author;
  }
  return obj;
};

module.exports = mongoose.model('Comment', commentSchema);
