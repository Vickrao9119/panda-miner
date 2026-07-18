const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Settings Routes
 * Handles settings-related endpoints
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
    console.error('[Settings Routes] Telegram verification failed:', error);
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
    console.error('[Settings Routes] Attach user failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to attach user'
    });
  }
};

// GET /api/settings - Get user settings
router.get('/', verifyTelegram, attachUser, asyncHandler(settingsController.getSettings.bind(settingsController)));

// PUT /api/settings - Update user settings
router.put('/', verifyTelegram, attachUser, asyncHandler(settingsController.updateSettings.bind(settingsController)));

// POST /api/settings/reset - Reset settings to defaults
router.post('/reset', verifyTelegram, attachUser, asyncHandler(settingsController.resetSettings.bind(settingsController)));

// GET /api/settings/languages - Get available languages
router.get('/languages', asyncHandler(settingsController.getLanguages.bind(settingsController)));

// GET /api/settings/themes - Get available themes
router.get('/themes', asyncHandler(settingsController.getThemes.bind(settingsController)));

// GET /api/settings/export - Export settings
router.get('/export', verifyTelegram, attachUser, asyncHandler(settingsController.exportSettings.bind(settingsController)));

// POST /api/settings/import - Import settings
router.post('/import', verifyTelegram, attachUser, asyncHandler(settingsController.importSettings.bind(settingsController)));

module.exports = router;
