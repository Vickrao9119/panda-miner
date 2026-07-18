const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Friend Routes
 * Handles friend system endpoints
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
    console.error('[Friend Routes] Telegram verification failed:', error);
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
    console.error('[Friend Routes] Attach user failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to attach user'
    });
  }
};

// POST /api/friends/request - Send friend request
router.post('/request', verifyTelegram, attachUser, asyncHandler(friendController.sendRequest.bind(friendController)));

// POST /api/friends/accept/:friendId - Accept friend request
router.post('/accept/:friendId', verifyTelegram, attachUser, asyncHandler(friendController.acceptRequest.bind(friendController)));

// POST /api/friends/reject/:friendId - Reject friend request
router.post('/reject/:friendId', verifyTelegram, attachUser, asyncHandler(friendController.rejectRequest.bind(friendController)));

// DELETE /api/friends/:friendId - Remove friend
router.delete('/:friendId', verifyTelegram, attachUser, asyncHandler(friendController.removeFriend.bind(friendController)));

// POST /api/friends/block - Block user
router.post('/block', verifyTelegram, attachUser, asyncHandler(friendController.blockUser.bind(friendController)));

// POST /api/friends/unblock - Unblock user
router.post('/unblock', verifyTelegram, attachUser, asyncHandler(friendController.unblockUser.bind(friendController)));

// GET /api/friends - Get friend list
router.get('/', verifyTelegram, attachUser, asyncHandler(friendController.getFriends.bind(friendController)));

// GET /api/friends/pending - Get pending requests
router.get('/pending', verifyTelegram, attachUser, asyncHandler(friendController.getPendingRequests.bind(friendController)));

// PUT /api/friends/online - Update online status
router.put('/online', verifyTelegram, attachUser, asyncHandler(friendController.updateOnlineStatus.bind(friendController)));

// GET /api/friends/search - Search users
router.get('/search', verifyTelegram, attachUser, asyncHandler(friendController.searchUsers.bind(friendController)));

module.exports = router;
