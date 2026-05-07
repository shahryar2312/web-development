const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { getUser, updateMe, updatePassword, getUserPosts, getUserComments, getAllUsers, deleteUser, banUser, updateUserRole, followUser, unfollowUser } = require('../controllers/user.controller');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const { param } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const upload = require('../middleware/uploadUtility');

const updateMeRules = [
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
  body('favoriteGames').optional().isArray({ max: 5 }).withMessage('Maximum 5 favourite games'),
  body('favoriteGames.*').optional().isString().isLength({ max: 50 }).withMessage('Each game name cannot exceed 50 characters'),
];

const updatePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain uppercase, lowercase, and a number'),
];

const validateUserId = [param('userId').isMongoId().withMessage('Invalid User ID format')];

// Admin routes
router.get('/',                      protect, adminOnly, getAllUsers);
router.delete('/:userId',            protect, adminOnly, validateUserId, validateRequest, deleteUser);
router.patch('/:userId/ban',         protect, adminOnly, validateUserId, validateRequest, banUser);
router.patch('/:userId/role',        protect, adminOnly, validateUserId, validateRequest, updateUserRole);

// /me routes must come before /:username so they aren't consumed as a username lookup
// upload.single('avatar') is a no-op for JSON requests; activates only on multipart/form-data
router.put('/me',          protect, upload.single('avatar'), updateMeRules, validateRequest, updateMe);
// 01.05 Ilia Klodin: dedicated avatar route so multipart upload doesnt go through the full updateMe validation, otherwise couldn't just update the avatar without also sending all the other fields fopr some reason
router.put('/me/avatar',   protect, upload.single('avatar'), updateMe);
router.put('/me/password', protect, updatePasswordRules, validateRequest, updatePassword);
router.get('/:username',             optionalAuth, getUser);
router.post('/:username/follow',     protect, followUser);
router.delete('/:username/follow',   protect, unfollowUser);
router.get('/:username/posts',       optionalAuth, getUserPosts);
router.get('/:username/comments',    optionalAuth, getUserComments);

module.exports = router;
