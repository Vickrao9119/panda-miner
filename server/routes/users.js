const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

/**
 * User Routes
 * Handles user profile-related endpoints
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
    console.error('[User Routes] Telegram verification failed:', error);
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
    console.error('[User Routes] Attach user failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to attach user'
    });
  }
};

// GET /api/users/profile - Get user profile
router.get('/profile', verifyTelegram, attachUser, asyncHandler(userController.getProfile.bind(userController)));

// PUT /api/users/profile - Update user profile
router.put('/profile', verifyTelegram, attachUser, asyncHandler(userController.updateProfile.bind(userController)));

// GET /api/users/achievements - Get user achievements
router.get('/achievements', verifyTelegram, attachUser, asyncHandler(userController.getAchievements.bind(userController)));

// GET /api/users/activity - Get user activity history
router.get('/activity', verifyTelegram, attachUser, asyncHandler(userController.getActivityHistory.bind(userController)));

// GET /api/users/stats - Get user statistics summary
router.get('/stats', verifyTelegram, attachUser, asyncHandler(userController.getStatsSummary.bind(userController)));

// DELETE /api/users/account - Delete user account
router.delete('/account', verifyTelegram, attachUser, asyncHandler(userController.deleteAccount.bind(userController)));

module.exports = router;
