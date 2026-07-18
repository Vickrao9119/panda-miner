const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Referral Routes
 * Handles referral system endpoints
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
    console.error('[Referral Routes] Telegram verification failed:', error);
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
    console.error('[Referral Routes] Attach user failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to attach user'
    });
  }
};

// GET /api/referral/info - Get referral info
router.get('/info', verifyTelegram, attachUser, asyncHandler(referralController.getReferralInfo.bind(referralController)));

// GET /api/referral/validate/:code - Validate referral code
router.get('/validate/:code', asyncHandler(referralController.validateCode.bind(referralController)));

// POST /api/referral/create - Create referral
router.post('/create', verifyTelegram, attachUser, asyncHandler(referralController.createReferral.bind(referralController)));

// POST /api/referral/complete/:referralId - Complete referral
router.post('/complete/:referralId', asyncHandler(referralController.completeReferral.bind(referralController)));

// GET /api/referral/list - Get referral list
router.get('/list', verifyTelegram, attachUser, asyncHandler(referralController.getReferralList.bind(referralController)));

// GET /api/referral/leaderboard - Get referral leaderboard
router.get('/leaderboard', asyncHandler(referralController.getLeaderboard.bind(referralController)));

module.exports = router;
