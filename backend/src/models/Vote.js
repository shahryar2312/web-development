const mongoose = require('mongoose');

// Single collection for both post and comment votes.
// targetModel acts as a discriminator so we know which collection to update.
const voteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    targetModel: {
      type: String,
      enum: ['Post', 'Comment'],
      required: true,
    },
    value: {
      type: Number,
      enum: [1, -1], // 1 = upvote, -1 = downvote
      required: true,
    },
  },
  { timestamps: true }
);

// Enforce one vote per user per target
voteSchema.index({ user: 1, targetId: 1, targetModel: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
