const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { getUser, updateMe, updatePassword, getUserPosts, getUserComments, getAllUsers, deleteUser, banUser, updateUserRole } = require('../controllers/user.controller');
const { protect, adminOnly } = require('../middleware/auth');
const { param } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

const updateMeRules = [
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
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
router.put('/me',          protect, updateMeRules,       validateRequest, updateMe);
router.put('/me/password', protect, updatePasswordRules, validateRequest, updatePassword);
router.get('/:username',             getUser);
router.get('/:username/posts',       getUserPosts);
router.get('/:username/comments',    getUserComments);

module.exports = router;
