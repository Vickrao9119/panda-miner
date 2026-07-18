const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Notification Routes
 * Handles notification endpoints
 */

/**
 * Middleware to verify Telegram initData
 */
const verifyTelegram = (req, res, next) => {
  try {
    const { initData } = req.body;

    // Dev mode: allow fake user
    if (!initData && authService.isDevMode()) {
      req.telegramUser = authService.getDevUser();
      return next();
    }

    // Verify initData
    const verification = authService.verifyInitData(initData);
    req.telegramUser = verification.user;
    next();

  } catch (error) {
    console.error('[Notification Routes] Telegram verification failed:', error);
    return res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
};

/**
 * Middleware to attach user to request
 */
const attachUser = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const telegramId = String(req.telegramUser.id);
    
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error('[Notification Routes] Attach user failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to attach user'
    });
  }
};

// GET /api/notifications - Get user notifications
router.get('/', verifyTelegram, attachUser, asyncHandler(notificationController.getNotifications.bind(notificationController)));

// PUT /api/notifications/:notificationId/read - Mark as read
router.put('/:notificationId/read', verifyTelegram, attachUser, asyncHandler(notificationController.markAsRead.bind(notificationController)));

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', verifyTelegram, attachUser, asyncHandler(notificationController.markAllAsRead.bind(notificationController)));

// DELETE /api/notifications/:notificationId - Delete notification
router.delete('/:notificationId', verifyTelegram, attachUser, asyncHandler(notificationController.deleteNotification.bind(notificationController)));

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', verifyTelegram, attachUser, asyncHandler(notificationController.getUnreadCount.bind(notificationController)));

module.exports = router;
