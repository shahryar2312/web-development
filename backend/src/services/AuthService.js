const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwtUtils');

class AuthService {
  /**
   * Minimal payload stored inside each JWT.
   * @param {object} user 
   * @returns {object}
   */
  static makePayload(user) {
    return {
      id: user._id,
      username: user.username,
      role: user.role,
    };
  }

  /**
   * Generates a new pair of tokens and saves the refresh token to the user.
   * @param {object} user 
   * @returns {Promise<object>} { accessToken, refreshToken }
   */
  static async issueTokens(user) {
    const payload = this.makePayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  }

  /**
   * Verifies a refresh token and rotates it.
   * @param {string} oldRefreshToken 
   * @returns {Promise<object>} { user, accessToken, refreshToken }
   */
  static async rotateTokens(oldRefreshToken) {
    let decoded;
    try {
      decoded = verifyRefreshToken(oldRefreshToken);
    } catch {
      throw new Error('Invalid or expired refresh token.');
    }

    const user = await User.findOne({ _id: decoded.id, refreshToken: oldRefreshToken }).select('+refreshToken');
    if (!user) throw new Error('Refresh token revoked.');

    const tokens = await this.issueTokens(user);
    return { user, ...tokens };
  }

  /**
   * Generates a password reset token, hashes it, and saves it to the user.
   * @param {object} user 
   * @returns {string} Plain token to be emailed
   */
  static async createPasswordResetToken(user) {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (10 mins)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    return resetToken;
  }
}

module.exports = AuthService;
