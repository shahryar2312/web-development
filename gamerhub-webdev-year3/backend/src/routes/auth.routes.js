const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { register, login, logout, getMe, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validateRequest = require('../middleware/validateRequest');

const registerRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
];

const forgotPasswordRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
];

const resetPasswordRules = [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

router.post('/register', authLimiter, registerRules, validateRequest, register);
router.post('/login',    authLimiter, loginRules,    validateRequest, login);
router.post('/logout',   logout);
router.get('/me',        protect, getMe);

router.post('/forgotpassword', forgotPasswordRules, validateRequest, forgotPassword);
router.put('/resetpassword/:resettoken', resetPasswordRules, validateRequest, resetPassword);

module.exports = router;
