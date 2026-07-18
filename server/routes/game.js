const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Game Routes
 * Handles all game-related endpoints: mining, rewards, stats
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
    console.error('[Game Routes] Telegram verification failed:', error);
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
    console.error('[Game Routes] Attach user failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to attach user'
    });
  }
};

// POST /api/game/mine - Process mining tap
router.post('/mine', verifyTelegram, attachUser, asyncHandler(gameController.mine.bind(gameController)));

// POST /api/state - Get user state (backward compatibility)
router.post('/state', verifyTelegram, attachUser, asyncHandler(gameController.getState.bind(gameController)));

// GET /api/game/state - Get user state
router.get('/state', verifyTelegram, attachUser, asyncHandler(gameController.getState.bind(gameController)));

// POST /api/game/chest - Claim chest reward
router.post('/chest', verifyTelegram, attachUser, asyncHandler(gameController.claimChest.bind(gameController)));

// POST /api/game/mystery-box - Open mystery box
router.post('/mystery-box', verifyTelegram, attachUser, asyncHandler(gameController.openMysteryBox.bind(gameController)));

// POST /api/game/daily-reward - Claim daily reward
router.post('/daily-reward', verifyTelegram, attachUser, asyncHandler(gameController.claimDailyReward.bind(gameController)));

// POST /api/game/offline-earnings - Claim offline earnings
router.post('/offline-earnings', verifyTelegram, attachUser, asyncHandler(gameController.claimOfflineEarnings.bind(gameController)));

// GET /api/game/stats - Get user statistics
router.get('/stats', verifyTelegram, attachUser, asyncHandler(gameController.getStats.bind(gameController)));

module.exports = router;
