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

  // Ilia Klodin 14.04 - regenerate session before setting userId, same fixation fix as login.
  // new account shouldn't inherit whatever session ID the visitor had before registering
  req.session.regenerate((err) => {
    if (err) return error(res, 'Registration failed.', 500);
    req.session.userId = user._id;
    return success(res, { user }, 201);
  });
});

/**
 * @desc    Log in with email or username and password
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email: identifier, password } = req.body;

  // 04.05 Ilia Klodin: added another obvious missing feature - login with the username, not only with email
  // 06.05 Ilia Klodin: case-insensitive username match so "iliatest" finds "IliaTest"
  const escapedId = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: { $regex: `^${escapedId}$`, $options: 'i' } }],
  }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return error(res, 'Invalid email/username or password.', 401);
  }

  // 23.04 Ilia Klodin: adding admin functionality - check at auth time if user is banned
  if (user.isBanned) {
    return error(res, 'Your account has been banned.', 403);
  }

  // Ilia Klodin 14.04 - regenerate the session before assigning userId so the old session ID
  // (which an attacker could've planted in the user's browser before they logged in) gets
  // destroyed and replaced with a fresh one — prevents sesion fixation attack
  req.session.regenerate((err) => {
    if (err) return error(res, 'Login failed.', 500);
    req.session.userId = user._id;
    return success(res, { user: user.toJSON() });
  });
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
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('joinedHubs', 'name slug icon game memberCount description');
  return success(res, { user });
});

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

  // Point to the frontend reset page, not the raw API endpoint
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
  const resetUrl = `${clientOrigin}/reset-password/${resetToken}`;

  const message = `You requested a password reset for your GamerHub account.\n\nClick the link below to reset your password (valid for 10 minutes):\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#1a1d27;color:#e2e8f0;border-radius:12px;">
      <h2 style="color:#7c3aed;margin-bottom:16px;">🎮 GamerHub Password Reset</h2>
      <p>You requested a password reset for your GamerHub account.</p>
      <p>Click the button below to choose a new password. This link is valid for <strong>10 minutes</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
      <p style="color:#94a3b8;font-size:13px;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color:#06b6d4;">${resetUrl}</a></p>
      <hr style="border-color:#2e3250;margin:24px 0"/>
      <p style="color:#64748b;font-size:12px;">If you did not request this, you can safely ignore this email. Your password will not change.</p>
    </div>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'GamerHub — Password Reset Request',
      message,
      html,
    });

    return success(res, { message: 'Password reset email sent. Please check your inbox.' });
  } catch (err) {
    console.error('[ForgotPassword] Failed to send reset email:', err.message);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return error(res, 'Email could not be sent. Please try again later.', 500);
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

  // Ilia Klodin 14.04 - regenerate here aswell, password reset logs the user in
  // so it needs the same session fixation fix as login
  req.session.regenerate((err) => {
    if (err) return error(res, 'Login failed.', 500);
    req.session.userId = user._id;
    return success(res, { user });
  });
});

module.exports = { register, login, logout, getMe, forgotPassword, resetPassword };
