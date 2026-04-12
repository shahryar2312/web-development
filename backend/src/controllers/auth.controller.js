const { validationResult } = require('express-validator');
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE_OPTIONS,
} = require('../utils/jwtUtils');
const { success, error } = require('../utils/apiResponse');

// Minimal payload stored inside each JWT — keep it small
const makePayload = (user) => ({
  id: user._id,
  username: user.username,
  role: user.role,
});

/**
 * @desc    Register a new user account and return tokens
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'Validation failed', 400, errs.array());

    const { username, email, password } = req.body;
    const user = await User.create({ username, email, password });

    const payload = makePayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    return success(res, { user, accessToken }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Log in with email and password; returns a new access token + sets refresh cookie
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'Validation failed', 400, errs.array());

    const { email, password } = req.body;

    // password and refreshToken are select:false — explicitly opt-in here
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password))) {
      return error(res, 'Invalid email or password.', 401);
    }

    const payload = makePayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    return success(res, { user: user.toJSON(), accessToken });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Log out the current user — clears the refresh cookie and invalidates the token server-side
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      // Invalidate server-side so the token can't be reused even before it expires
      await User.findOneAndUpdate({ refreshToken }, { $unset: { refreshToken: 1 } });
    }
    res.clearCookie('refreshToken');
    return success(res, { message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Issue a fresh access token using the httpOnly refresh-token cookie (token rotation)
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return error(res, 'No refresh token.', 401);

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return error(res, 'Invalid or expired refresh token.', 401);
    }

    // Token must still match what's stored — catches reuse after logout
    const user = await User.findOne({ _id: decoded.id, refreshToken }).select('+refreshToken');
    if (!user) return error(res, 'Refresh token revoked.', 401);

    const payload = makePayload(user);
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Rotate: old token is replaced with new one (refresh-token rotation)
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);
    return success(res, { accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Return the currently authenticated user's profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = (req, res) => success(res, { user: req.user });

module.exports = { register, login, logout, refresh, getMe };
