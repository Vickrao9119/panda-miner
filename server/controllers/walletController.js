const walletService = require('../services/walletService');

/**
 * Wallet Controller
 * Handles wallet-related endpoints
 */
class WalletController {
  /**
   * POST /api/wallet/connect
   * Connect wallet to user account
   */
  async connect(req, res) {
    try {
      const user = req.user;
      const { walletAddress, walletType = 'ton' } = req.body;

      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address is required'
        });
      }

      const result = await walletService.connectWallet(
        user._id.toString(),
        user.telegramId,
        walletAddress,
        walletType
      );

      return res.json(result);

    } catch (error) {
      console.error('[WalletController] Connect error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to connect wallet'
      });
    }
  }

  /**
   * POST /api/wallet/disconnect
   * Disconnect wallet
   */
  async disconnect(req, res) {
    try {
      const user = req.user;
      const result = await walletService.disconnectWallet(
        user._id.toString(),
        user.telegramId
      );
      return res.json(result);

    } catch (error) {
      console.error('[WalletController] Disconnect error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to disconnect wallet'
      });
    }
  }

  /**
   * POST /api/wallet/verify
   * Verify wallet
   */
  async verify(req, res) {
    try {
      const user = req.user;
      const { verificationCode } = req.body;

      if (!verificationCode) {
        return res.status(400).json({
          success: false,
          error: 'Verification code is required'
        });
      }

      const result = await walletService.verifyWallet(
        user._id.toString(),
        user.telegramId,
        verificationCode
      );

      return res.json(result);

    } catch (error) {
      console.error('[WalletController] Verify error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to verify wallet'
      });
    }
  }

  /**
   * GET /api/wallet
   * Get wallet information
   */
  async getWallet(req, res) {
    try {
      const user = req.user;
      const result = await walletService.getWalletInfo(
        user._id.toString(),
        user.telegramId
      );
      return res.json(result);

    } catch (error) {
      console.error('[WalletController] Get wallet error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get wallet information'
      });
    }
  }

  /**
   * POST /api/wallet/withdraw
   * Create withdrawal request
   */
  async withdraw(req, res) {
    try {
      const user = req.user;
      const { amount, toAddress } = req.body;

      if (!amount || !toAddress) {
        return res.status(400).json({
          success: false,
          error: 'Amount and toAddress are required'
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Amount must be greater than 0'
        });
      }

      const result = await walletService.createWithdrawal(
        user._id.toString(),
        user.telegramId,
        amount,
        toAddress
      );

      return res.json(result);

    } catch (error) {
      console.error('[WalletController] Withdraw error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to create withdrawal'
      });
    }
  }

  /**
   * POST /api/wallet/deposit
   * Create deposit (admin only)
   */
  async deposit(req, res) {
    try {
      const user = req.user;
      if (!user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { userId, telegramId, amount, fromAddress, txHash } = req.body;

      if (!amount || !fromAddress) {
        return res.status(400).json({
          success: false,
          error: 'Amount and fromAddress are required'
        });
      }

      const result = await walletService.createDeposit(
        userId,
        telegramId,
        amount,
        fromAddress,
        txHash
      );

      return res.json(result);

    } catch (error) {
      console.error('[WalletController] Deposit error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to create deposit'
      });
    }
  }

  /**
   * GET /api/wallet/transactions
   * Get transaction history
   */
  async getTransactions(req, res) {
    try {
      const user = req.user;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const result = await walletService.getTransactionHistory(
        user._id.toString(),
        user.telegramId,
        limit,
        offset
      );

      return res.json(result);

    } catch (error) {
      console.error('[WalletController] Get transactions error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get transaction history'
      });
    }
  }

  /**
   * GET /api/wallet/transactions/:transactionId
   * Get specific transaction
   */
  async getTransaction(req, res) {
    try {
      const user = req.user;
      const { transactionId } = req.params;

      const result = await walletService.getTransaction(
        user._id.toString(),
        transactionId
      );

      return res.json(result);

    } catch (error) {
      console.error('[WalletController] Get transaction error:', error);
      return res.status(404).json({
        success: false,
        error: error.message || 'Transaction not found'
      });
    }
  }

  /**
   * PUT /api/wallet/transactions/:transactionId/status
   * Update transaction status (admin only)
   */
  async updateTransactionStatus(req, res) {
    try {
      const user = req.user;
      if (!user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { transactionId } = req.params;
      const { status, txHash } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }

      const result = await walletService.updateTransactionStatus(
        transactionId,
        status,
        txHash
      );

      return res.json(result);

    } catch (error) {
      console.error('[WalletController] Update status error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to update transaction status'
      });
    }
  }
}

module.exports = new WalletController();
