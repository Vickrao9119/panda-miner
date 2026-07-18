const User = require('../models/User');
const MiningHistory = require('../models/MiningHistory');
const ClaimHistory = require('../models/ClaimHistory');
const { v4: uuidv4 } = require('uuid');
const { xpForLevel } = require('../utils/helpers');

/**
 * User Service
 * Handles user profile operations
 */
class UserService {
  /**
   * Get user profile
   */
  async getProfile(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate additional stats
      const miningHistory = await MiningHistory.find({ telegramId })
        .sort({ timestamp: -1 })
        .limit(100);

      const totalMiningSessions = miningHistory.length;
      const avgMiningPerSession = totalMiningSessions > 0 
        ? Math.floor(miningHistory.reduce((sum, h) => sum + h.coinsEarned, 0) / totalMiningSessions)
        : 0;

      const claimHistory = await ClaimHistory.find({ telegramId })
        .sort({ claimedAt: -1 })
        .limit(50);

      return {
        success: true,
        profile: {
          // Basic info
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
          xpNeeded: xpForLevel(user.level),
          xpProgress: (user.xp / xpForLevel(user.level)) * 100,

          // Energy
          energy: user.energy,
          maxEnergy: user.maxEnergy,
          energyPercent: (user.energy / user.maxEnergy) * 100,

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

          // Badges & achievements
          badges: user.badges,
          achievements: Object.fromEntries(user.achievements || {}),

          // Referral
          referralCode: user.referralCode,
          referralCount: user.referralCount,
          totalReferralEarnings: user.totalReferralEarnings,
          referralEarningsClaimed: user.referralEarningsClaimed,

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
          totalMiningSessions,
          avgMiningPerSession,
          totalClaims: claimHistory.length,

          // Wallet
          walletConnected: user.walletConnected,
          walletAddress: user.walletAddress,
          totalWithdrawn: user.totalWithdrawn,
          totalDeposited: user.totalDeposited,

          // Account
          isBanned: user.isBanned,
          isAdmin: user.isAdmin,

          // Timestamps
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastActiveTime: user.lastActiveTime,
        },
      };

    } catch (error) {
      console.error('[UserService] Get profile error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(telegramId, updates) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      // Allowed fields to update
      const allowedFields = ['firstName', 'lastName', 'username', 'photoUrl', 'activeSkin'];
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          user[field] = updates[field];
        }
      }

      await user.save();

      return {
        success: true,
        profile: await this.getProfile(telegramId),
      };

    } catch (error) {
      console.error('[UserService] Update profile error:', error);
      throw error;
    }
  }

  /**
   * Get user achievements
   */
  async getAchievements(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      // Define achievement definitions
      const achievementDefs = {
        first_mine: { name: 'First Mine', description: 'Mine for the first time', icon: 'pickaxe' },
        level_5: { name: 'Rising Star', description: 'Reach level 5', icon: 'star' },
        level_10: { name: 'Miner Pro', description: 'Reach level 10', icon: 'gem' },
        level_25: { name: 'Master Miner', description: 'Reach level 25', icon: 'crown' },
        level_50: { name: 'Mining Legend', description: 'Reach level 50', icon: 'trophy' },
        coins_1k: { name: 'Coin Collector', description: 'Earn 1,000 coins', icon: 'coins' },
        coins_10k: { name: 'Coin Hoarder', description: 'Earn 10,000 coins', icon: 'treasure' },
        coins_100k: { name: 'Coin Tycoon', description: 'Earn 100,000 coins', icon: 'chest' },
        referral_1: { name: 'Social Butterfly', description: 'Refer 1 friend', icon: 'users' },
        referral_10: { name: 'Influencer', description: 'Refer 10 friends', icon: 'megaphone' },
        streak_7: { name: 'Dedicated', description: '7 day login streak', icon: 'calendar' },
        streak_30: { name: 'Loyal', description: '30 day login streak', icon: 'heart' },
      };

      // Check which achievements are unlocked
      const unlockedAchievements = {};
      
      if (user.totalMined > 0) unlockedAchievements.first_mine = true;
      if (user.level >= 5) unlockedAchievements.level_5 = true;
      if (user.level >= 10) unlockedAchievements.level_10 = true;
      if (user.level >= 25) unlockedAchievements.level_25 = true;
      if (user.level >= 50) unlockedAchievements.level_50 = true;
      if (user.totalMined >= 1000) unlockedAchievements.coins_1k = true;
      if (user.totalMined >= 10000) unlockedAchievements.coins_10k = true;
      if (user.totalMined >= 100000) unlockedAchievements.coins_100k = true;
      if (user.referralCount >= 1) unlockedAchievements.referral_1 = true;
      if (user.referralCount >= 10) unlockedAchievements.referral_10 = true;
      if (user.dailyRewardStreak >= 7) unlockedAchievements.streak_7 = true;
      if (user.dailyRewardStreak >= 30) unlockedAchievements.streak_30 = true;

      return {
        success: true,
        achievements: Object.entries(achievementDefs).map(([id, def]) => ({
          id,
          ...def,
          unlocked: unlockedAchievements[id] || false,
          unlockedAt: user.achievements?.get(id)?.unlockedAt || null,
        })),
      };

    } catch (error) {
      console.error('[UserService] Get achievements error:', error);
      throw error;
    }
  }

  /**
   * Get user activity history
   */
  async getActivityHistory(telegramId, limit = 50, offset = 0) {
    try {
      const [miningHistory, claimHistory] = await Promise.all([
        MiningHistory.find({ telegramId })
          .sort({ timestamp: -1 })
          .skip(offset)
          .limit(limit),
        ClaimHistory.find({ telegramId })
          .sort({ claimedAt: -1 })
          .skip(offset)
          .limit(limit),
      ]);

      const activities = [
        ...miningHistory.map(h => ({
          type: 'mining',
          amount: h.coinsEarned,
          timestamp: h.timestamp,
        })),
        ...claimHistory.map(h => ({
          type: h.claimType,
          amount: h.coinsEarned,
          timestamp: h.claimedAt,
        })),
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return {
        success: true,
        activities: activities.slice(0, limit),
      };

    } catch (error) {
      console.error('[UserService] Get activity history error:', error);
      throw error;
    }
  }

  /**
   * Get user statistics summary
   */
  async getStatsSummary(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      const [
        totalMiningSessions,
        totalClaims,
        avgMiningPerSession,
      ] = await Promise.all([
        MiningHistory.countDocuments({ telegramId }),
        ClaimHistory.countDocuments({ telegramId }),
        MiningHistory.aggregate([
          { $match: { telegramId } },
          { $group: { _id: null, avg: { $avg: '$coinsEarned' } } },
        ]),
      ]);

      return {
        success: true,
        summary: {
          totalMined: user.totalMined,
          totalTaps: user.totalTaps,
          totalPlayTime: user.totalPlayTime,
          highestLevel: user.highestLevel,
          maxCoins: user.maxCoins,
          referralCount: user.referralCount,
          totalReferralEarnings: user.totalReferralEarnings,
          dailyRewardStreak: user.dailyRewardStreak,
          completedTasks: user.completedTasks.length,
          completedMissions: user.completedMissions.length,
          badges: user.badges.length,
          totalMiningSessions,
          totalClaims,
          avgMiningPerSession: avgMiningPerSession[0]?.avg || 0,
        },
      };

    } catch (error) {
      console.error('[UserService] Get stats summary error:', error);
      throw error;
    }
  }

  /**
   * Delete user account (soft delete)
   */
  async deleteAccount(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      // Soft delete by marking as banned
      user.isBanned = true;
      user.banReason = 'Account deleted by user';
      user.banExpiry = null;
      await user.save();

      return {
        success: true,
      };

    } catch (error) {
      console.error('[UserService] Delete account error:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
