const express = require('express');
const { body, param } = require('express-validator');

const { getHubPosts, createPost, getPost, updatePost, deletePost, votePost } = require('../controllers/post.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const { voteLimiter } = require('../middleware/rateLimiter');
const validateRequest = require('../middleware/validateRequest');
const upload = require('../middleware/uploadUtility');
const xssSanitizer = require('../middleware/xssSanitizer');

const createRules = [
  body('title').trim().isLength({ min: 3, max: 300 }).withMessage('Title must be 3–300 characters'),
  body('content').optional().isLength({ max: 40000 }),
  body('type').optional().isIn(['text', 'image', 'link', 'lfg']).withMessage('Invalid post type'),
  body('url').optional({ checkFalsy: true }).isURL().withMessage('URL must be a valid URL'),
  body('tags').optional().isArray({ max: 5 }).withMessage('Maximum 5 tags allowed'),
  body('flair').optional().isLength({ max: 50 }),
];

const updateRules = [
  body('title').optional().trim().isLength({ min: 3, max: 300 }),
  body('content').optional().isLength({ max: 40000 }),
  body('tags').optional().isArray({ max: 5 }),
  body('flair').optional().isLength({ max: 50 }),
];

const validateHubId = [param('hubId').isMongoId().withMessage('Invalid Hub ID format')];
const validatePostId = [param('postId').isMongoId().withMessage('Invalid Post ID format')];

// Mounted at /api/hubs/:hubId/posts — mergeParams carries :hubId down
const hubPostsRouter = express.Router({ mergeParams: true });
hubPostsRouter.get('/',  optionalAuth, validateHubId, validateRequest, getHubPosts);
hubPostsRouter.post('/', protect, validateHubId, validateRequest, upload.single('image'), xssSanitizer, createRules, validateRequest, createPost);

// Mounted at /api/posts
const postRouter = express.Router();
postRouter.get('/:postId',       optionalAuth,            getPost);
postRouter.put('/:postId',       protect,    xssSanitizer, updateRules, validateRequest, updatePost);
postRouter.delete('/:postId',    protect,                 deletePost);
postRouter.post('/:postId/vote', protect,    voteLimiter, votePost);

module.exports = { hubPostsRouter, postRouter };
