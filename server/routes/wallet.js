const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Wallet Routes
 * Handles wallet-related endpoints
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
    console.error('[Wallet Routes] Telegram verification failed:', error);
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
    console.error('[Wallet Routes] Attach user failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to attach user'
    });
  }
};

// POST /api/wallet/connect - Connect wallet
router.post('/connect', verifyTelegram, attachUser, asyncHandler(walletController.connect.bind(walletController)));

// POST /api/wallet/disconnect - Disconnect wallet
router.post('/disconnect', verifyTelegram, attachUser, asyncHandler(walletController.disconnect.bind(walletController)));

// POST /api/wallet/verify - Verify wallet
router.post('/verify', verifyTelegram, attachUser, asyncHandler(walletController.verify.bind(walletController)));

// GET /api/wallet - Get wallet info
router.get('/', verifyTelegram, attachUser, asyncHandler(walletController.getWallet.bind(walletController)));

// POST /api/wallet/withdraw - Create withdrawal
router.post('/withdraw', verifyTelegram, attachUser, asyncHandler(walletController.withdraw.bind(walletController)));

// POST /api/wallet/deposit - Create deposit (admin)
router.post('/deposit', verifyTelegram, attachUser, asyncHandler(walletController.deposit.bind(walletController)));

// GET /api/wallet/transactions - Get transaction history
router.get('/transactions', verifyTelegram, attachUser, asyncHandler(walletController.getTransactions.bind(walletController)));

// GET /api/wallet/transactions/:transactionId - Get specific transaction
router.get('/transactions/:transactionId', verifyTelegram, attachUser, asyncHandler(walletController.getTransaction.bind(walletController)));

// PUT /api/wallet/transactions/:transactionId/status - Update transaction status (admin)
router.put('/transactions/:transactionId/status', verifyTelegram, attachUser, asyncHandler(walletController.updateTransactionStatus.bind(walletController)));

module.exports = router;
