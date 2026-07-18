const User = require('../models/User');
const Referral = require('../models/Referral');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');

/**
 * Referral Service
 * Handles referral system: codes, earnings, statistics
 */
class ReferralService {
  /**
   * Referral rewards configuration
   */
  static REWARDS = {
    REFERRER_COINS: 1000,      // Coins referrer gets
    REFERRED_COINS: 500,        // Coins referred user gets
    REFERRER_PERCENTAGE: 0.1,   // 10% of referred user's mining
    MAX_DAILY_EARNINGS: 10000,  // Max daily earnings from referrals
  };

  /**
   * Get user's referral code and link
   */
  async getReferralInfo(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      // Generate referral code if user doesn't have one
      if (!user.referralCode) {
        user.referralCode = User.generateReferralCode();
        await user.save();
      }

      // Get referral statistics
      const referrals = await Referral.find({ referrerTelegramId: telegramId });
      const completedReferrals = referrals.filter(r => r.isCompleted).length;
      const pendingReferrals = referrals.length - completedReferrals;
      const totalEarnings = referrals.reduce((sum, r) => sum + r.referrerEarnings, 0);

      return {
        success: true,
        referralCode: user.referralCode,
        referralLink: `https://t.me/your_bot?start=${user.referralCode}`,
        stats: {
          totalReferrals: referrals.length,
          completedReferrals,
          pendingReferrals,
          totalEarnings,
          referralCount: user.referralCount,
          totalReferralEarnings: user.totalReferralEarnings,
          referralEarningsClaimed: user.referralEarningsClaimed,
        }
      };

    } catch (error) {
      console.error('[ReferralService] Get referral info error:', error);
      throw error;
    }
  }

  /**
   * Validate referral code
   */
  async validateReferralCode(code) {
    try {
      const referrer = await User.findOne({ referralCode: code });
      
      if (!referrer) {
        return {
          success: false,
          error: 'Invalid referral code'
        };
      }

      return {
        success: true,
        referrer: {
          firstName: referrer.firstName,
          username: referrer.username,
          telegramId: referrer.telegramId,
        }
      };

    } catch (error) {
      console.error('[ReferralService] Validate referral code error:', error);
      throw error;
    }
  }

  /**
   * Create referral relationship
   */
  async createReferral(referrerTelegramId, referredTelegramId, referralCode, ipAddress = null) {
    try {
      // Check if referral already exists
      const existingReferral = await Referral.findOne({ referredTelegramId });
      if (existingReferral) {
        throw new Error('User already has a referrer');
      }

      // Find referrer
      const referrer = await User.findOne({ telegramId: referrerTelegramId });
      if (!referrer) {
        throw new Error('Referrer not found');
      }

      // Find referred user
      const referredUser = await User.findOne({ telegramId: referredTelegramId });
      if (!referredUser) {
        throw new Error('Referred user not found');
      }

      // Check for self-referral
      if (referrerTelegramId === referredTelegramId) {
        throw new Error('Cannot refer yourself');
      }

      // Create referral record
      const referral = await Referral.create({
        referralId: uuidv4(),
        referrerId: referrer._id.toString(),
        referrerTelegramId: referrer.telegramId,
        referredId: referredUser._id.toString(),
        referredTelegramId: referredUser.telegramId,
        referralCode,
        ipAddress,
      });

      // Update referred user
      referredUser.referredBy = referrerTelegramId;
      await referredUser.save();

      // Update referrer stats
      referrer.referralCount += 1;
      await referrer.save();

      // Log referral creation
      await this.logReferral(referral, 'created');

      return {
        success: true,
        referral,
      };

    } catch (error) {
      console.error('[ReferralService] Create referral error:', error);
      throw error;
    }
  }

  /**
   * Complete referral (when referred user performs required action)
   */
  async completeReferral(referralId) {
    try {
      const referral = await Referral.findOne({ referralId });
      if (!referral) {
        throw new Error('Referral not found');
      }

      if (referral.isCompleted) {
        throw new Error('Referral already completed');
      }

      // Get users
      const referrer = await User.findOne({ telegramId: referral.referrerTelegramId });
      const referredUser = await User.findOne({ telegramId: referral.referredTelegramId });

      if (!referrer || !referredUser) {
        throw new Error('User not found');
      }

      // Mark referral as completed
      referral.isCompleted = true;
      referral.completedAt = new Date();
      await referral.save();

      // Reward referrer
      referrer.coins += this.constructor.REWARDS.REFERRER_COINS;
      referrer.totalReferralEarnings += this.constructor.REWARDS.REFERRER_COINS;
      await referrer.save();

      // Reward referred user
      referredUser.coins += this.constructor.REWARDS.REFERRED_COINS;
      await referredUser.save();

      // Log completion
      await this.logReferral(referral, 'completed', {
        referrerReward: this.constructor.REWARDS.REFERRER_COINS,
        referredReward: this.constructor.REWARDS.REFERRED_COINS,
      });

      return {
        success: true,
        referrerReward: this.constructor.REWARDS.REFERRER_COINS,
        referredReward: this.constructor.REWARDS.REFERRED_COINS,
      };

    } catch (error) {
      console.error('[ReferralService] Complete referral error:', error);
      throw error;
    }
  }

  /**
   * Add mining earnings to referrer (passive income)
   */
  async addMiningEarnings(referredTelegramId, amount) {
    try {
      const referral = await Referral.findOne({ referredTelegramId, isCompleted: true });
      if (!referral) {
        return; // No completed referral
      }

      const referrer = await User.findOne({ telegramId: referral.referrerTelegramId });
      if (!referrer) {
        return; // Referrer not found
      }

      // Calculate earnings (percentage of mining)
      const earnings = Math.floor(amount * this.constructor.REWARDS.REFERRER_PERCENTAGE);

      if (earnings <= 0) {
        return;
      }

      // Check daily limit
      const today = new Date().toDateString();
      // TODO: Implement daily earnings tracking

      // Add earnings
      referrer.coins += earnings;
      referrer.totalReferralEarnings += earnings;
      referral.referrerEarnings += earnings;
      
      await referrer.save();
      await referral.save();

      // Log earnings
      await this.logReferral(referral, 'earnings', {
        amount,
        earnings,
        percentage: this.constructor.REWARDS.REFERRER_PERCENTAGE,
      });

      return {
        success: true,
        earnings,
      };

    } catch (error) {
      console.error('[ReferralService] Add mining earnings error:', error);
      throw error;
    }
  }

  /**
   * Get referral list for a user
   */
  async getReferralList(telegramId, limit = 20, offset = 0) {
    try {
      const referrals = await Referral.find({ referrerTelegramId: telegramId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('referredId', 'firstName username photoUrl');

      const total = await Referral.countDocuments({ referrerTelegramId: telegramId });

      return {
        success: true,
        referrals: referrals.map(r => ({
          referralId: r.referralId,
          referredUser: {
            firstName: r.referredId?.firstName || 'Unknown',
            username: r.referredId?.username,
            photoUrl: r.referredId?.photoUrl,
          },
          isCompleted: r.isCompleted,
          completedAt: r.completedAt,
          referrerEarnings: r.referrerEarnings,
          createdAt: r.createdAt,
        })),
        total,
        limit,
        offset,
      };

    } catch (error) {
      console.error('[ReferralService] Get referral list error:', error);
      throw error;
    }
  }

  /**
   * Get referral leaderboard
   */
  async getReferralLeaderboard(limit = 50) {
    try {
      const topReferrers = await User.find({})
        .sort({ referralCount: -1, totalReferralEarnings: -1 })
        .limit(limit)
        .select('firstName username referralCount totalReferralEarnings photoUrl');

      return {
        success: true,
        leaderboard: topReferrers.map((user, index) => ({
          rank: index + 1,
          firstName: user.firstName,
          username: user.username,
          photoUrl: user.photoUrl,
          referralCount: user.referralCount,
          totalEarnings: user.totalReferralEarnings,
        })),
      };

    } catch (error) {
      console.error('[ReferralService] Get referral leaderboard error:', error);
      throw error;
    }
  }

  /**
   * Log referral activity
   */
  async logReferral(referral, action, metadata = {}) {
    try {
      await Log.create({
        logId: uuidv4(),
        level: 'info',
        category: 'referral',
        message: `Referral ${action}`,
        telegramId: referral.referrerTelegramId,
        metadata: new Map(Object.entries({
          referralId: referral.referralId,
          referredTelegramId: referral.referredTelegramId,
          ...metadata,
        })),
      });
    } catch (error) {
      console.error('[ReferralService] Failed to log referral:', error);
    }
  }
}

module.exports = new ReferralService();
