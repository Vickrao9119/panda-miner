const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Authentication Routes
 * Handles user authentication, login, logout, and referral management
 */

/**
 * Middleware to verify Telegram initData
 * Can be bypassed in dev mode when ALLOW_DEV_AUTH=true
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
    console.error('[Auth Routes] Telegram verification failed:', error);
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
    console.error('[Auth Routes] Attach user failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to attach user'
    });
  }
};

// POST /api/auth/login - Authenticate user
router.post('/login', asyncHandler(authController.login.bind(authController)));

// GET /api/auth/me - Get current user info
router.get('/me', verifyTelegram, attachUser, asyncHandler(authController.me.bind(authController)));

// POST /api/auth/logout - Logout user
router.post('/logout', asyncHandler(authController.logout.bind(authController)));

// GET /api/auth/referral/:code - Validate referral code
router.get('/referral/:code', asyncHandler(authController.validateReferral.bind(authController)));

// GET /api/auth/my-referral - Get user's referral info
router.get('/my-referral', verifyTelegram, attachUser, asyncHandler(authController.getMyReferral.bind(authController)));

module.exports = router;
