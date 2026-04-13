const crypto = require('crypto');
const User = require('../models/User');
const AuthService = require('../services/AuthService');
const sendEmail = require('../utils/emailService');
const { success, error } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Register a new user account and return tokens
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  
  // Check if user already exists
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) return error(res, 'Username or email already exists.', 409);

  const user = await User.create({ username, email, password });

  // Create session
  req.session.userId = user._id;

  return success(res, { user }, 201);
});

/**
 * @desc    Log in with email and password
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return error(res, 'Invalid email or password.', 401);
  }

  // Create session
  req.session.userId = user._id;

  return success(res, { user: user.toJSON() });
});

/**
 * @desc    Log out the current user
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = asyncHandler(async (req, res) => {
  req.session.destroy((err) => {
    if (err) return error(res, 'Logout failed.', 500);
    res.clearCookie('connect.sid');
    return success(res, { message: 'Logged out successfully.' });
  });
});

/**
 * @desc    Return the currently authenticated user's profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = (req, res) => success(res, { user: req.user });

/**
 * @desc    Forgot password — sends a reset token to the user's email
 * @route   POST /api/auth/forgotpassword
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return error(res, 'There is no user with that email.', 404);

  const resetToken = await AuthService.createPasswordResetToken(user);
  
  // Create reset URL
  const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/resetpassword/${resetToken}`;
  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token',
      message,
    });

    return success(res, { message: 'Email sent' });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return error(res, 'Email could not be sent', 500);
  }
});

/**
 * @desc    Reset password using the token sent via email
 * @route   PUT /api/auth/resetpassword/:resettoken
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) return error(res, 'Invalid or expired token', 400);

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // Create session (log them in)
  req.session.userId = user._id;

  return success(res, { user });
});

module.exports = { register, login, logout, getMe, forgotPassword, resetPassword };
