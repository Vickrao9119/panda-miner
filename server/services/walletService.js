const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');

/**
 * Wallet Service
 * Handles wallet operations: connect, disconnect, withdraw, deposit, transactions
 */
class WalletService {
  /**
   * Connect wallet to user account
   */
  async connectWallet(userId, telegramId, walletAddress, walletType = 'ton') {
    try {
      // Check if wallet already exists
      const existingWallet = await Wallet.findOne({ walletAddress });
      if (existingWallet) {
        if (existingWallet.userId === userId) {
          throw new Error('Wallet already connected to your account');
        }
        throw new Error('Wallet already connected to another account');
      }

      // Create or update wallet
      let wallet = await Wallet.findOne({ userId });
      
      if (wallet) {
        // Update existing wallet
        wallet.walletAddress = walletAddress;
        wallet.walletType = walletType;
        wallet.isConnected = true;
        wallet.connectedAt = new Date();
        wallet.isVerified = false;
        wallet.verificationCode = this.generateVerificationCode();
      } else {
        // Create new wallet
        wallet = await Wallet.create({
          walletId: uuidv4(),
          userId,
          telegramId,
          walletAddress,
          walletType,
          isConnected: true,
          connectedAt: new Date(),
          isVerified: false,
          verificationCode: this.generateVerificationCode(),
        });
      }

      await wallet.save();

      // Update user wallet status
      const user = await User.findOne({ telegramId });
      if (user) {
        user.walletConnected = true;
        user.walletAddress = walletAddress;
        await user.save();
      }

      // Log wallet connection
      await this.logWalletActivity(telegramId, 'wallet_connected', { walletAddress });

      return {
        success: true,
        wallet: this.sanitizeWallet(wallet),
        verificationCode: wallet.verificationCode,
      };

    } catch (error) {
      console.error('[WalletService] Connect wallet error:', error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(userId, telegramId) {
    try {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      wallet.isConnected = false;
      wallet.connectedAt = null;
      await wallet.save();

      // Update user wallet status
      const user = await User.findOne({ telegramId });
      if (user) {
        user.walletConnected = false;
        user.walletAddress = null;
        await user.save();
      }

      // Log wallet disconnection
      await this.logWalletActivity(telegramId, 'wallet_disconnected');

      return {
        success: true,
      };

    } catch (error) {
      console.error('[WalletService] Disconnect wallet error:', error);
      throw error;
    }
  }

  /**
   * Verify wallet
   */
  async verifyWallet(userId, telegramId, verificationCode) {
    try {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.verificationCode !== verificationCode) {
        throw new Error('Invalid verification code');
      }

      wallet.isVerified = true;
      wallet.lastVerified = new Date();
      wallet.verificationCode = null;
      await wallet.save();

      // Log wallet verification
      await this.logWalletActivity(telegramId, 'wallet_verified', { walletAddress: wallet.walletAddress });

      return {
        success: true,
        wallet: this.sanitizeWallet(wallet),
      };

    } catch (error) {
      console.error('[WalletService] Verify wallet error:', error);
      throw error;
    }
  }

  /**
   * Get wallet information
   */
  async getWalletInfo(userId, telegramId) {
    try {
      const wallet = await Wallet.findOne({ userId });
      
      if (!wallet) {
        return {
          success: true,
          wallet: null,
          isConnected: false,
        };
      }

      return {
        success: true,
        wallet: this.sanitizeWallet(wallet),
        isConnected: wallet.isConnected,
      };

    } catch (error) {
      console.error('[WalletService] Get wallet info error:', error);
      throw error;
    }
  }

  /**
   * Create withdrawal request
   */
  async createWithdrawal(userId, telegramId, amount, toAddress) {
    try {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || !wallet.isConnected) {
        throw new Error('Wallet not connected');
      }

      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has enough coins
      if (user.coins < amount) {
        throw new Error('Insufficient balance');
      }

      // Check daily withdrawal limit
      const today = new Date().toDateString();
      if (wallet.lastWithdrawalReset !== today) {
        wallet.dailyWithdrawn = 0;
        wallet.lastWithdrawalReset = today;
      }

      if (wallet.dailyWithdrawn + amount > wallet.dailyWithdrawalLimit) {
        throw new Error('Daily withdrawal limit exceeded');
      }

      // Deduct coins
      user.coins -= amount;
      user.totalWithdrawn += amount;
      await user.save();

      // Update wallet
      wallet.dailyWithdrawn += amount;
      await wallet.save();

      // Create transaction record
      const transaction = await Transaction.create({
        transactionId: uuidv4(),
        userId,
        telegramId,
        type: 'withdrawal',
        amount,
        currency: 'TON',
        status: 'pending',
        toAddress,
        fee: 0,
        createdAt: new Date(),
        category: 'withdrawal',
      });

      // Log withdrawal
      await this.logWalletActivity(telegramId, 'withdrawal_created', {
        amount,
        toAddress,
        transactionId: transaction.transactionId,
      });

      return {
        success: true,
        transaction: this.sanitizeTransaction(transaction),
        newBalance: user.coins,
      };

    } catch (error) {
      console.error('[WalletService] Create withdrawal error:', error);
      throw error;
    }
  }

  /**
   * Create deposit (admin only)
   */
  async createDeposit(userId, telegramId, amount, fromAddress, txHash) {
    try {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      // Add coins
      user.coins += amount;
      user.totalDeposited += amount;
      await user.save();

      // Create transaction record
      const transaction = await Transaction.create({
        transactionId: uuidv4(),
        userId,
        telegramId,
        type: 'deposit',
        amount,
        currency: 'TON',
        status: 'completed',
        fromAddress,
        txHash,
        completedAt: new Date(),
        category: 'deposit',
      });

      // Log deposit
      await this.logWalletActivity(telegramId, 'deposit_created', {
        amount,
        fromAddress,
        txHash,
      });

      return {
        success: true,
        transaction: this.sanitizeTransaction(transaction),
        newBalance: user.coins,
      };

    } catch (error) {
      console.error('[WalletService] Create deposit error:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId, telegramId, limit = 20, offset = 0) {
    try {
      const transactions = await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);

      const total = await Transaction.countDocuments({ userId });

      return {
        success: true,
        transactions: transactions.map(t => this.sanitizeTransaction(t)),
        total,
        limit,
        offset,
      };

    } catch (error) {
      console.error('[WalletService] Get transaction history error:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(userId, transactionId) {
    try {
      const transaction = await Transaction.findOne({ transactionId, userId });
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        success: true,
        transaction: this.sanitizeTransaction(transaction),
      };

    } catch (error) {
      console.error('[WalletService] Get transaction error:', error);
      throw error;
    }
  }

  /**
   * Update transaction status (admin only)
   */
  async updateTransactionStatus(transactionId, status, txHash = null) {
    try {
      const transaction = await Transaction.findOne({ transactionId });
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      transaction.status = status;
      if (status === 'completed') {
        transaction.completedAt = new Date();
      }
      if (txHash) {
        transaction.txHash = txHash;
      }
      await transaction.save();

      return {
        success: true,
        transaction: this.sanitizeTransaction(transaction),
      };

    } catch (error) {
      console.error('[WalletService] Update transaction status error:', error);
      throw error;
    }
  }

  /**
   * Generate verification code
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Sanitize wallet for response
   */
  sanitizeWallet(wallet) {
    return {
      walletId: wallet.walletId,
      walletAddress: wallet.walletAddress,
      walletType: wallet.walletType,
      balance: wallet.balance,
      isConnected: wallet.isConnected,
      isVerified: wallet.isVerified,
      connectedAt: wallet.connectedAt,
      lastVerified: wallet.lastVerified,
      dailyWithdrawalLimit: wallet.dailyWithdrawalLimit,
      dailyWithdrawn: wallet.dailyWithdrawn,
    };
  }

  /**
   * Sanitize transaction for response
   */
  sanitizeTransaction(transaction) {
    return {
      transactionId: transaction.transactionId,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      fromAddress: transaction.fromAddress,
      toAddress: transaction.toAddress,
      txHash: transaction.txHash,
      fee: transaction.fee,
      networkFee: transaction.networkFee,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
      description: transaction.description,
      category: transaction.category,
    };
  }

  /**
   * Log wallet activity
   */
  async logWalletActivity(telegramId, action, metadata = {}) {
    try {
      await Log.create({
        logId: uuidv4(),
        level: 'info',
        category: 'wallet',
        message: `Wallet ${action}`,
        telegramId,
        metadata: new Map(Object.entries(metadata)),
      });
    } catch (error) {
      console.error('[WalletService] Failed to log wallet activity:', error);
    }
  }
}

module.exports = new WalletService();
