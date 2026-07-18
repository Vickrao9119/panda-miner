const notificationService = require('../services/notificationService');

/**
 * Notification Controller
 * Handles notification-related endpoints
 */
class NotificationController {
  /**
   * GET /api/notifications
   * Get user notifications
   */
  async getNotifications(req, res) {
    try {
      const user = req.user;
      const { unreadOnly = false, limit = 20, offset = 0 } = req.query;

      const result = await notificationService.getUserNotifications(
        user.telegramId,
        unreadOnly === 'true',
        parseInt(limit),
        parseInt(offset)
      );

      return res.json(result);

    } catch (error) {
      console.error('[NotificationController] Get notifications error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get notifications'
      });
    }
  }

  /**
   * PUT /api/notifications/:notificationId/read
   * Mark notification as read
   */
  async markAsRead(req, res) {
    try {
      const user = req.user;
      const { notificationId } = req.params;

      const result = await notificationService.markAsRead(notificationId, user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[NotificationController] Mark as read error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to mark as read'
      });
    }
  }

  /**
   * PUT /api/notifications/read-all
   * Mark all notifications as read
   */
  async markAllAsRead(req, res) {
    try {
      const user = req.user;
      const result = await notificationService.markAllAsRead(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[NotificationController] Mark all as read error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to mark all as read'
      });
    }
  }

  /**
   * DELETE /api/notifications/:notificationId
   * Delete notification
   */
  async deleteNotification(req, res) {
    try {
      const user = req.user;
      const { notificationId } = req.params;

      const result = await notificationService.deleteNotification(notificationId, user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[NotificationController] Delete notification error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete notification'
      });
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Get unread count
   */
  async getUnreadCount(req, res) {
    try {
      const user = req.user;
      const result = await notificationService.getUnreadCount(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[NotificationController] Get unread count error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get unread count'
      });
    }
  }
}

module.exports = new NotificationController();
