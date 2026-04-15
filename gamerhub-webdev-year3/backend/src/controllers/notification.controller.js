const Notification = require('../models/Notification');
const { success, error } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all notifications for the authenticated user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate('sender', 'username avatar')
    .populate('post', 'title')
    .sort({ createdAt: -1 });

  return success(res, { notifications });
});

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) return error(res, 'Notification not found.', 404);
  
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return error(res, 'Not authorised.', 403);
  }

  notification.isRead = true;
  await notification.save();

  return success(res, { notification });
});

/**
 * @desc    Mark all notifications as read for the authenticated user
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );

  return success(res, { message: 'All notifications marked as read.' });
});

module.exports = { getNotifications, markAsRead, markAllAsRead };
