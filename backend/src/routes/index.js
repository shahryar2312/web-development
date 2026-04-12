const express = require('express');
const router = express.Router();

const authRoutes                       = require('./auth.routes');
const userRoutes                       = require('./user.routes');
const hubRoutes                        = require('./hub.routes');
const { hubPostsRouter, postRouter }   = require('./post.routes');
const { postCommentsRouter, commentRouter } = require('./comment.routes');
const { lfgRouter, lfgHubRouter }      = require('./lfg.routes');

// Auth
router.use('/auth',   authRoutes);

// Users
router.use('/users',  userRoutes);

// Hubs (base CRUD + join/leave/members)
router.use('/hubs',   hubRoutes);

// Hub-scoped feeds  — note: :hubId param is forwarded via mergeParams in child routers
router.use('/hubs/:hubId/posts', hubPostsRouter);   // GET, POST
router.use('/hubs/:hubId/lfg',   lfgHubRouter);     // GET

// Individual posts
router.use('/posts',    postRouter);                // GET, PUT, DELETE, VOTE

// Post-scoped comments
router.use('/posts/:postId/comments', postCommentsRouter); // GET, POST

// Individual comments
router.use('/comments', commentRouter);             // PUT, DELETE, VOTE

// Global LFG feed + LFG status update
router.use('/lfg', lfgRouter);

module.exports = router;
