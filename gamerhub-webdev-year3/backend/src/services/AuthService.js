class AuthService {
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
