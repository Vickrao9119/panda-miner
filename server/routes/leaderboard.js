const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Leaderboard Routes
 * Handles leaderboard endpoints
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
    console.error('[Leaderboard Routes] Telegram verification failed:', error);
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
    console.error('[Leaderboard Routes] Attach user failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to attach user'
    });
  }
};

// GET /api/leaderboard/global - Get global leaderboard
router.get('/global', asyncHandler(leaderboardController.getGlobal.bind(leaderboardController)));

// GET /api/leaderboard/weekly - Get weekly leaderboard
router.get('/weekly', asyncHandler(leaderboardController.getWeekly.bind(leaderboardController)));

// GET /api/leaderboard/monthly - Get monthly leaderboard
router.get('/monthly', asyncHandler(leaderboardController.getMonthly.bind(leaderboardController)));

// GET /api/leaderboard/friends - Get friends leaderboard
router.get('/friends', verifyTelegram, attachUser, asyncHandler(leaderboardController.getFriends.bind(leaderboardController)));

// GET /api/leaderboard/level - Get top level leaderboard
router.get('/level', asyncHandler(leaderboardController.getTopLevel.bind(leaderboardController)));

// GET /api/leaderboard/referral - Get top referrers leaderboard
router.get('/referral', asyncHandler(leaderboardController.getTopReferrers.bind(leaderboardController)));

// GET /api/leaderboard/rank/:type - Get user's rank
router.get('/rank/:type', verifyTelegram, attachUser, asyncHandler(leaderboardController.getUserRank.bind(leaderboardController)));

// GET /api/leaderboard/summary - Get user's leaderboard summary
router.get('/summary', verifyTelegram, attachUser, asyncHandler(leaderboardController.getSummary.bind(leaderboardController)));

module.exports = router;
