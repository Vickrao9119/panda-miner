const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Shop Routes
 * Handles shop-related endpoints: items, purchases, categories
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
    console.error('[Shop Routes] Telegram verification failed:', error);
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
    console.error('[Shop Routes] Attach user failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to attach user'
    });
  }
};

// GET /api/shop/items - Get all shop items
router.get('/items', verifyTelegram, attachUser, asyncHandler(shopController.getItems.bind(shopController)));

// POST /api/shop/purchase - Purchase an item
router.post('/purchase', verifyTelegram, attachUser, asyncHandler(shopController.purchase.bind(shopController)));

// GET /api/shop/categories - Get all categories
router.get('/categories', asyncHandler(shopController.getCategories.bind(shopController)));

// GET /api/shop/item/:itemId - Get specific item
router.get('/item/:itemId', verifyTelegram, attachUser, asyncHandler(shopController.getItem.bind(shopController)));

module.exports = router;
