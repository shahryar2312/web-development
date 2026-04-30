const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500, default: '' },
  },
  { _id: true }
);

const hubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hub name is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Hub name must be at least 3 characters'],
      maxlength: [50, 'Hub name cannot exceed 50 characters'],
      match: [
        /^[a-zA-Z0-9_ -]+$/,
        'Hub name can only contain letters, numbers, spaces, underscores, and hyphens',
      ],
    },
    // URL-friendly identifier auto-derived from name
    slug: { type: String, unique: true, lowercase: true },
    game: {
      type: String,
      required: [true, 'Game name is required'],
      trim: true,
      maxlength: [100, 'Game name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    icon: { type: String, default: '' },
    banner: { type: String, default: '' },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    memberCount: { type: Number, default: 1 },
    bannedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    rules: [ruleSchema],
    isPrivate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate a URL-safe slug from the hub name
hubSchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');
  }
  next();
});

// Compound indexes
hubSchema.index({ name: 'text', game: 'text' });

hubSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.bannedUsers;
  return obj;
};

module.exports = mongoose.model('Hub', hubSchema);
