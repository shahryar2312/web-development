const mongoose = require('mongoose');

// Embedded sub-document — only populated when post.type === 'lfg'
const lfgDetailsSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile', 'Cross-platform'],
    },
    region: {
      type: String,
      enum: ['NA', 'EU', 'Asia', 'OCE', 'SA', 'Global'],
      default: 'Global',
    },
    voiceChat: { type: Boolean, default: false },
    gameMode: { type: String, maxlength: 100, default: '' },
    skillLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Any'],
      default: 'Any',
    },
    playersNeeded: { type: Number, min: 1, max: 100 },
    currentPlayers: { type: Number, default: 1, min: 1 },
    schedule: { type: String, maxlength: 200, default: '' },
    requirements: { type: String, maxlength: 500, default: '' },
    contactInfo: { type: String, maxlength: 200, default: '' },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    content: {
      type: String,
      maxlength: [40000, 'Content cannot exceed 40000 characters'],
      default: '',
    },
    // 'lfg' is treated as a first-class post type so it flows through the regular feed
    type: {
      type: String,
      enum: ['text', 'image', 'link', 'lfg'],
      default: 'text',
    },
    url: { type: String, default: '' }, // used by 'image' and 'link' types
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
    },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    // Denormalised score = upvotes - downvotes. Updated atomically on every vote.
    voteScore: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    tags: [{ type: String, maxlength: 30 }],
    flair: { type: String, maxlength: 50, default: '' },
    isPinned: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    lfgDetails: lfgDetailsSchema,
  },
  { timestamps: true }
);

// Compound indexes covering the most common query patterns
postSchema.index({ hub: 1, createdAt: -1 });   // hub feed sorted by new
postSchema.index({ hub: 1, voteScore: -1 });   // hub feed sorted by hot/top
postSchema.index({ author: 1, createdAt: -1 }); // user profile post list
postSchema.index({ type: 1, hub: 1 });          // LFG filter by hub
postSchema.index({ title: 'text', content: 'text' }, { weights: { title: 10, content: 5 } });

postSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Post', postSchema);
