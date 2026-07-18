const authService = require('../services/authService');
const { v4: uuidv4 } = require('uuid');

/**
 * Authentication Controller
 * Handles authentication endpoints and user session management
 */
class AuthController {
  /**
   * POST /api/auth/login
   * Authenticate user with Telegram initData
   */
  async login(req, res) {
    try {
      const { initData, referralCode } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const deviceInfo = req.headers['user-agent'];

      // Check if dev mode and no initData provided
      if (!initData && authService.isDevMode()) {
        const devUser = authService.getDevUser();
        const user = await authService.findOrCreateUser(devUser, ipAddress, deviceInfo);
        
        return res.json({
          success: true,
          user: this.sanitizeUser(user),
          isNewUser: !user.referredBy && user.createdAt === user.updatedAt,
          message: 'Dev mode authentication successful'
        });
      }

      // Verify initData
      const verification = authService.verifyInitData(initData);
      
      // Check ban status
      const isBanned = await authService.checkBanStatus(verification.user.id);
      if (isBanned) {
        const banDetails = await authService.getBanDetails(verification.user.id);
        return res.status(403).json({
          success: false,
          error: 'Account banned',
          banDetails
        });
      }

      // Find or create user
      const user = await authService.findOrCreateUser(verification.user, ipAddress, deviceInfo);

      // Handle referral if provided
      let referral = null;
      if (referralCode && !user.referredBy) {
        referral = await authService.handleReferral(user._id.toString(), referralCode, ipAddress);
      }

      return res.json({
        success: true,
        user: this.sanitizeUser(user),
        referral: referral ? {
          code: referralCode,
          referrerName: referral.referrerTelegramId
        } : null,
        isNewUser: !user.referredBy && user.createdAt === user.updatedAt,
        message: 'Authentication successful'
      });

    } catch (error) {
      console.error('[AuthController] Login error:', error);
      return res.status(401).json({
        success: false,
        error: error.message || 'Authentication failed'
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current user information
   */
  async me(req, res) {
    try {
      const user = req.user;

      // Check ban status
      const isBanned = await authService.checkBanStatus(user.telegramId);
      if (isBanned) {
        const banDetails = await authService.getBanDetails(user.telegramId);
        return res.status(403).json({
          success: false,
          error: 'Account banned',
          banDetails
        });
      }

      return res.json({
        success: true,
        user: this.sanitizeUser(user)
      });

    } catch (error) {
      console.error('[AuthController] Me error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user information'
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout user (clear session)
   */
  async logout(req, res) {
    try {
      // In a JWT-based system, we would invalidate the token here
      // For now, we just return success
      return res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('[AuthController] Logout error:', error);
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }

  /**
   * GET /api/auth/referral/:code
   * Validate referral code
   */
  async validateReferral(req, res) {
    try {
      const { code } = req.params;
      const User = require('../models/User');

      const referrer = await User.findOne({ referralCode: code });
      
      if (!referrer) {
        return res.status(404).json({
          success: false,
          error: 'Invalid referral code'
        });
      }

      return res.json({
        success: true,
        referrer: {
          firstName: referrer.firstName,
          username: referrer.username,
        }
      });

    } catch (error) {
      console.error('[AuthController] Validate referral error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate referral code'
      });
    }
  }

  /**
   * GET /api/auth/my-referral
   * Get user's referral code and stats
   */
  async getMyReferral(req, res) {
    try {
      const user = req.user;
      const Referral = require('../models/Referral');

      // Generate referral code if user doesn't have one
      if (!user.referralCode) {
        user.referralCode = User.generateReferralCode();
        await user.save();
      }

      // Get referral stats
      const referrals = await Referral.find({ referrerTelegramId: user.telegramId });
      const completedReferrals = referrals.filter(r => r.isCompleted).length;
      const totalEarnings = referrals.reduce((sum, r) => sum + r.referrerEarnings, 0);

      return res.json({
        success: true,
        referralCode: user.referralCode,
        referralLink: `https://t.me/your_bot?start=${user.referralCode}`,
        stats: {
          totalReferrals: referrals.length,
          completedReferrals,
          pendingReferrals: referrals.length - completedReferrals,
          totalEarnings,
        }
      });

    } catch (error) {
      console.error('[AuthController] Get my referral error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch referral information'
      });
    }
  }

  /**
   * Sanitize user object for client response
   * Removes sensitive information
   */
  sanitizeUser(user) {
    return {
      id: user._id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      languageCode: user.languageCode,
      isPremium: user.isPremium,
      photoUrl: user.photoUrl,
      
      // Game stats
      coins: user.coins,
      totalMined: user.totalMined,
      xp: user.xp,
      level: user.level,
      
      // Energy
      energy: user.energy,
      maxEnergy: user.maxEnergy,
      
      // Mining power
      tapPower: user.tapPower,
      tapMultiplier: user.tapMultiplier,
      autoTapEnabled: user.autoTapEnabled,
      autoTapPower: user.autoTapPower,
      
      // Regeneration
      regenTier: user.regenTier,
      
      // Offline mining
      offlineMiningEnabled: user.offlineMiningEnabled,
      offlineMiningRate: user.offlineMiningRate,
      
      // Rewards
      chestReady: user.chestReady,
      lastBoxClaim: user.lastBoxClaim,
      
      // Shop
      shopLevels: Object.fromEntries(user.shopLevels || {}),
      purchasedSkins: user.purchasedSkins,
      activeSkin: user.activeSkin,
      
      // Badges
      badges: user.badges,
      achievements: Object.fromEntries(user.achievements || {}),
      
      // Referral
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      totalReferralEarnings: user.totalReferralEarnings,
      
      // Daily rewards
      dailyRewardStreak: user.dailyRewardStreak,
      dailyRewardAvailable: user.dailyRewardAvailable,
      
      // Tasks
      completedTasks: user.completedTasks,
      completedMissions: user.completedMissions,
      
      // Statistics
      totalTaps: user.totalTaps,
      totalPlayTime: user.totalPlayTime,
      highestLevel: user.highestLevel,
      maxCoins: user.maxCoins,
      
      // Wallet
      walletConnected: user.walletConnected,
      totalWithdrawn: user.totalWithdrawn,
      totalDeposited: user.totalDeposited,
      
      // Settings
      settings: user.settings,
      
      // Account status
      isBanned: user.isBanned,
      isAdmin: user.isAdmin,
      
      // Timestamps
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

module.exports = new AuthController();
