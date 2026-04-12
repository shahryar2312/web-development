const express = require('express');
const { body } = require('express-validator');

const { getComments, createComment, updateComment, deleteComment, voteComment } = require('../controllers/comment.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const { voteLimiter } = require('../middleware/rateLimiter');

const createRules = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment cannot be empty')
    .isLength({ max: 10000 }),
  body('parentId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Invalid parent comment ID'),
];

const updateRules = [
  body('content').trim().notEmpty().isLength({ max: 10000 }),
];

// Mounted at /api/posts/:postId/comments — mergeParams carries :postId down
const postCommentsRouter = express.Router({ mergeParams: true });
postCommentsRouter.get('/',  optionalAuth,           getComments);
postCommentsRouter.post('/', protect, createRules,   createComment);

// Mounted at /api/comments
const commentRouter = express.Router();
commentRouter.put('/:commentId',       protect, updateRules, updateComment);
commentRouter.delete('/:commentId',    protect,              deleteComment);
commentRouter.post('/:commentId/vote', protect, voteLimiter, voteComment);

module.exports = { postCommentsRouter, commentRouter };
