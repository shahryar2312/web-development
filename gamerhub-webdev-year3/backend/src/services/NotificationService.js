const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Create a notification for a user.
   * @param {object} params - { recipient, sender, type, post, comment }
   */
  static async createNotification({ recipient, sender, type, post, comment }) {
    // Avoid notifying users about their own actions
    if (recipient.toString() === sender.toString()) return;

    // Optional: Avoid duplicate notifications for the same upvote/re-notifying
    if (type.startsWith('upvote')) {
      const existing = await Notification.findOne({
        recipient,
        sender,
        type,
        post,
        comment
      });
      if (existing) return;
    }

    return await Notification.create({
      recipient,
      sender,
      type,
      post,
      comment,
    });
  }
}

module.exports = NotificationService;
