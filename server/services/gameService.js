const User = require('../models/User');
const MiningHistory = require('../models/MiningHistory');
const ClaimHistory = require('../models/ClaimHistory');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');
const { xpForLevel, calculateCoinsPerHour } = require('../utils/helpers');

/**
 * Game Service
 * Handles all game logic: mining, energy, XP, levels, rewards
 */
class GameService {
  /**
   * Process a mining tap
   */
  async processMining(userId, telegramId, ipAddress = null, userAgent = null) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is banned
      if (user.isBanned) {
        throw new Error('User is banned');
      }

      // Apply energy regeneration
      user.applyEnergyRegen();

      // Check energy
      const ENERGY_PER_TAP = 5;
      if (user.energy < ENERGY_PER_TAP) {
        await user.save();
        return {
          success: false,
          error: 'Not enough energy',
          state: this.getPublicState(user)
        };
      }

      // Calculate mining rewards
      const tapPower = user.tapPower * user.tapMultiplier;
      const XP_PER_TAP = 1;
      
      // Check for active boosts
      let effectiveTapPower = tapPower;
      let effectiveXP = XP_PER_TAP;
      
      for (const [boostId, boost] of user.activeBoosts) {
        if (new Date(boost.endTime) > new Date()) {
          if (boost.effect === 'tap_multiplier') {
            effectiveTapPower *= boost.value;
          }
          if (boost.effect === 'xp_multiplier') {
            effectiveXP *= boost.value;
          }
        }
      }

      // Apply mining
      user.energy -= ENERGY_PER_TAP;
      user.coins += effectiveTapPower;
      user.totalMined += effectiveTapPower;
      user.xp += effectiveXP;
      user.totalTaps += 1;
      user.lastActiveTime = new Date();

      // Update max coins
      if (user.coins > user.maxCoins) {
        user.maxCoins = user.coins;
      }

      // Check level up
      const leveledUp = this.checkLevelUp(user);

      await user.save();

      // Log mining history
      await this.logMining(user, effectiveTapPower, effectiveXP, ENERGY_PER_TAP, ipAddress, userAgent);

      return {
        success: true,
        gained: effectiveTapPower,
        xpGained: effectiveXP,
        energy: user.energy,
        leveledUp,
        state: this.getPublicState(user)
      };

    } catch (error) {
      console.error('[GameService] Mining error:', error);
      throw error;
    }
  }

  /**
   * Check and handle level up
   */
  checkLevelUp(user) {
    let leveled = false;

    while (user.xp >= xpForLevel(user.level)) {
      user.xp -= xpForLevel(user.level);
      user.level += 1;
      leveled = true;

      // Update highest level
      if (user.level > user.highestLevel) {
        user.highestLevel = user.level;
      }

      // Unlock chest at level milestones (5, 10, 15, ...)
      if (user.level % 5 === 0 && user.level > user.chestClaimedForLevel) {
        user.chestReady = true;
      }
    }

    return leveled;
  }

  /**
   * Get user's current public state
   */
  getPublicState(user) {
    return {
      playerName: user.firstName,
      coins: user.coins,
      totalMined: user.totalMined,
      xp: user.xp,
      level: user.level,
      xpNeeded: xpForLevel(user.level),
      energy: user.energy,
      maxEnergy: user.maxEnergy,
      tapPower: user.tapPower,
      tapMultiplier: user.tapMultiplier,
      regenTier: user.regenTier,
      chestReady: user.chestReady,
      lastBoxClaim: user.lastBoxClaim,
      boxCooldownMs: 3600000, // 1 hour
      shopLevels: Object.fromEntries(user.shopLevels || {}),
      badges: user.badges,
      achievements: Object.fromEntries(user.achievements || {}),
      offlineMiningEnabled: user.offlineMiningEnabled,
      offlineMiningRate: user.offlineMiningRate,
      autoTapEnabled: user.autoTapEnabled,
      autoTapPower: user.autoTapPower,
      dailyRewardStreak: user.dailyRewardStreak,
      dailyRewardAvailable: user.dailyRewardAvailable,
      coinsPerHour: calculateCoinsPerHour(user),
    };
  }

  /**
   * Get user state with energy regeneration applied
   */
  async getUserState(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      // Apply energy regeneration
      user.applyEnergyRegen();
      await user.save();

      return {
        success: true,
        state: this.getPublicState(user)
      };

    } catch (error) {
      console.error('[GameService] Get state error:', error);
      throw error;
    }
  }

  /**
   * Claim chest reward
   */
  async claimChest(userId, telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.chestReady) {
        throw new Error('Chest not ready');
      }

      const reward = 500 + user.level * 100;
      user.coins += reward;
      user.totalMined += reward;
      user.chestReady = false;
      user.chestClaimedForLevel = user.level;

      await user.save();

      // Log claim
      await this.logClaim(user, 'chest', reward, 0);

      return {
        success: true,
        reward,
        state: this.getPublicState(user)
      };

    } catch (error) {
      console.error('[GameService] Claim chest error:', error);
      throw error;
    }
  }

  /**
   * Open mystery box
   */
  async openMysteryBox(userId, telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      const COOLDOWN_MS = 3600000; // 1 hour
      const remaining = COOLDOWN_MS - (Date.now() - user.lastBoxClaim);

      if (remaining > 0) {
        throw new Error('Box on cooldown');
      }

      // Random reward calculation
      const roll = Math.random();
      let reward;
      if (roll < 0.05) reward = 5000; // 5% jackpot
      else if (roll < 0.3) reward = 1000; // 25% big reward
      else reward = 200 + Math.floor(Math.random() * 300); // 70% small reward

      user.coins += reward;
      user.totalMined += reward;
      user.lastBoxClaim = Date.now();

      await user.save();

      // Log claim
      await this.logClaim(user, 'mystery_box', reward, 0);

      return {
        success: true,
        reward,
        state: this.getPublicState(user)
      };

    } catch (error) {
      console.error('[GameService] Open mystery box error:', error);
      throw error;
    }
  }

  /**
   * Claim daily reward
   */
  async claimDailyReward(userId, telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user can claim
      if (!user.canClaimDailyReward()) {
        throw new Error('Daily reward not available');
      }

      // Calculate reward based on streak
      const streak = user.dailyRewardStreak + 1;
      const baseReward = 100;
      const streakBonus = Math.min(streak * 10, 500); // Max 500 bonus
      const reward = baseReward + streakBonus;

      // Apply reward
      user.coins += reward;
      user.totalMined += reward;
      user.dailyRewardStreak = streak;
      user.lastDailyRewardClaim = new Date();
      user.dailyRewardAvailable = false;

      // Update longest streak
      if (streak > user.highestLevel) { // Reusing highestLevel for longest streak temporarily
        // Will add separate field later
      }

      await user.save();

      // Log claim
      await this.logClaim(user, 'daily_reward', reward, 0, { streak });

      return {
        success: true,
        reward,
        streak,
        state: this.getPublicState(user)
      };

    } catch (error) {
      console.error('[GameService] Claim daily reward error:', error);
      throw error;
    }
  }

  /**
   * Claim offline earnings
   */
  async claimOfflineEarnings(userId, telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.offlineMiningEnabled) {
        throw new Error('Offline mining not enabled');
      }

      const earnings = user.calculateOfflineEarnings();
      
      if (earnings <= 0) {
        throw new Error('No offline earnings to claim');
      }

      user.coins += earnings;
      user.totalMined += earnings;
      user.offlineEarningsClaimed += earnings;
      user.lastActiveTime = new Date();

      await user.save();

      // Log claim
      await this.logClaim(user, 'offline_mining', earnings, 0);

      return {
        success: true,
        earnings,
        state: this.getPublicState(user)
      };

    } catch (error) {
      console.error('[GameService] Claim offline earnings error:', error);
      throw error;
    }
  }

  /**
   * Log mining activity
   */
  async logMining(user, coinsEarned, xpEarned, energyUsed, ipAddress, userAgent) {
    try {
      await MiningHistory.create({
        miningId: uuidv4(),
        userId: user._id.toString(),
        telegramId: user.telegramId,
        coinsEarned,
        xpEarned,
        energyUsed,
        tapPower: user.tapPower,
        tapMultiplier: user.tapMultiplier,
        ipAddress,
        userAgent,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[GameService] Failed to log mining:', error);
    }
  }

  /**
   * Log claim activity
   */
  async logClaim(user, claimType, coinsEarned, xpEarned, metadata = {}) {
    try {
      await ClaimHistory.create({
        claimId: uuidv4(),
        userId: user._id.toString(),
        telegramId: user.telegramId,
        claimType,
        coinsEarned,
        xpEarned,
        metadata: new Map(Object.entries(metadata)),
        claimedAt: new Date(),
      });
    } catch (error) {
      console.error('[GameService] Failed to log claim:', error);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      const miningHistory = await MiningHistory.find({ telegramId })
        .sort({ timestamp: -1 })
        .limit(100);

      const totalMiningSessions = miningHistory.length;
      const avgMiningPerSession = totalMiningSessions > 0 
        ? Math.floor(miningHistory.reduce((sum, h) => sum + h.coinsEarned, 0) / totalMiningSessions)
        : 0;

      return {
        success: true,
        stats: {
          totalTaps: user.totalTaps,
          totalPlayTime: user.totalPlayTime,
          totalMined: user.totalMined,
          highestLevel: user.highestLevel,
          maxCoins: user.maxCoins,
          referralCount: user.referralCount,
          totalReferralEarnings: user.totalReferralEarnings,
          dailyRewardStreak: user.dailyRewardStreak,
          completedTasks: user.completedTasks.length,
          completedMissions: user.completedMissions.length,
          badges: user.badges.length,
          totalMiningSessions,
          avgMiningPerSession,
          coinsPerHour: calculateCoinsPerHour(user),
        }
      };

    } catch (error) {
      console.error('[GameService] Get stats error:', error);
      throw error;
    }
  }
}

module.exports = new GameService();
