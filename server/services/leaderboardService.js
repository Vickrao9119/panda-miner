const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

/**
 * Leaderboard Service
 * Handles all leaderboard operations: global, weekly, monthly, friends
 */
class LeaderboardService {
  /**
   * Get global leaderboard by total coins mined
   */
  async getGlobalLeaderboard(limit = 50, offset = 0) {
    try {
      const users = await User.find({ isBanned: false })
        .sort({ totalMined: -1, level: -1 })
        .skip(offset)
        .limit(limit)
        .select('telegramId firstName username photoUrl totalMined level coins badges');

      const total = await User.countDocuments({ isBanned: false });

      return {
        success: true,
        type: 'global',
        metric: 'totalMined',
        leaderboard: users.map((user, index) => ({
          rank: offset + index + 1,
          telegramId: user.telegramId,
          firstName: user.firstName,
          username: user.username,
          photoUrl: user.photoUrl,
          totalMined: user.totalMined,
          level: user.level,
          coins: user.coins,
          badges: user.badges,
        })),
        total,
        limit,
        offset,
      };

    } catch (error) {
      console.error('[LeaderboardService] Get global leaderboard error:', error);
      throw error;
    }
  }

  /**
   * Get weekly leaderboard (coins earned this week)
   */
  async getWeeklyLeaderboard(limit = 50, offset = 0) {
    try {
      // Calculate week start (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      weekStart.setHours(0, 0, 0, 0);

      // For now, use totalMined as proxy (would need weekly earnings tracking)
      const users = await User.find({ isBanned: false })
        .sort({ totalMined: -1 })
        .skip(offset)
        .limit(limit)
        .select('telegramId firstName username photoUrl totalMined level coins');

      const total = await User.countDocuments({ isBanned: false });

      return {
        success: true,
        type: 'weekly',
        metric: 'totalMined',
        weekStart,
        leaderboard: users.map((user, index) => ({
          rank: offset + index + 1,
          telegramId: user.telegramId,
          firstName: user.firstName,
          username: user.username,
          photoUrl: user.photoUrl,
          totalMined: user.totalMined,
          level: user.level,
          coins: user.coins,
        })),
        total,
        limit,
        offset,
      };

    } catch (error) {
      console.error('[LeaderboardService] Get weekly leaderboard error:', error);
      throw error;
    }
  }

  /**
   * Get monthly leaderboard
   */
  async getMonthlyLeaderboard(limit = 50, offset = 0) {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const users = await User.find({ isBanned: false })
        .sort({ totalMined: -1 })
        .skip(offset)
        .limit(limit)
        .select('telegramId firstName username photoUrl totalMined level coins');

      const total = await User.countDocuments({ isBanned: false });

      return {
        success: true,
        type: 'monthly',
        metric: 'totalMined',
        monthStart,
        leaderboard: users.map((user, index) => ({
          rank: offset + index + 1,
          telegramId: user.telegramId,
          firstName: user.firstName,
          username: user.username,
          photoUrl: user.photoUrl,
          totalMined: user.totalMined,
          level: user.level,
          coins: user.coins,
        })),
        total,
        limit,
        offset,
      };

    } catch (error) {
      console.error('[LeaderboardService] Get monthly leaderboard error:', error);
      throw error;
    }
  }

  /**
   * Get friends leaderboard
   */
  async getFriendsLeaderboard(telegramId, limit = 50) {
    try {
      const Friend = require('../models/Friend');
      
      // Get user's friends
      const friends = await Friend.find({
        userId: telegramId,
        status: 'accepted',
      }).select('friendTelegramId');

      const friendTelegramIds = friends.map(f => f.friendTelegramId);
      friendTelegramIds.push(telegramId); // Include self

      const users = await User.find({
        telegramId: { $in: friendTelegramIds },
        isBanned: false,
      })
        .sort({ totalMined: -1 })
        .limit(limit)
        .select('telegramId firstName username photoUrl totalMined level coins badges');

      return {
        success: true,
        type: 'friends',
        metric: 'totalMined',
        leaderboard: users.map((user, index) => ({
          rank: index + 1,
          telegramId: user.telegramId,
          firstName: user.firstName,
          username: user.username,
          photoUrl: user.photoUrl,
          totalMined: user.totalMined,
          level: user.level,
          coins: user.coins,
          badges: user.badges,
          isSelf: user.telegramId === telegramId,
        })),
      };

    } catch (error) {
      console.error('[LeaderboardService] Get friends leaderboard error:', error);
      throw error;
    }
  }

  /**
   * Get top level leaderboard
   */
  async getTopLevelLeaderboard(limit = 50, offset = 0) {
    try {
      const users = await User.find({ isBanned: false })
        .sort({ level: -1, xp: -1 })
        .skip(offset)
        .limit(limit)
        .select('telegramId firstName username photoUrl level xp coins badges');

      const total = await User.countDocuments({ isBanned: false });

      return {
        success: true,
        type: 'level',
        metric: 'level',
        leaderboard: users.map((user, index) => ({
          rank: offset + index + 1,
          telegramId: user.telegramId,
          firstName: user.firstName,
          username: user.username,
          photoUrl: user.photoUrl,
          level: user.level,
          xp: user.xp,
          coins: user.coins,
          badges: user.badges,
        })),
        total,
        limit,
        offset,
      };

    } catch (error) {
      console.error('[LeaderboardService] Get top level leaderboard error:', error);
      throw error;
    }
  }

  /**
   * Get top referrers leaderboard
   */
  async getTopReferrersLeaderboard(limit = 50, offset = 0) {
    try {
      const users = await User.find({ isBanned: false })
        .sort({ referralCount: -1, totalReferralEarnings: -1 })
        .skip(offset)
        .limit(limit)
        .select('telegramId firstName username photoUrl referralCount totalReferralEarnings');

      const total = await User.countDocuments({ isBanned: false });

      return {
        success: true,
        type: 'referral',
        metric: 'referralCount',
        leaderboard: users.map((user, index) => ({
          rank: offset + index + 1,
          telegramId: user.telegramId,
          firstName: user.firstName,
          username: user.username,
          photoUrl: user.photoUrl,
          referralCount: user.referralCount,
          totalReferralEarnings: user.totalReferralEarnings,
        })),
        total,
        limit,
        offset,
      };

    } catch (error) {
      console.error('[LeaderboardService] Get top referrers leaderboard error:', error);
      throw error;
    }
  }

  /**
   * Get user's rank on a specific leaderboard
   */
  async getUserRank(telegramId, type = 'global') {
    try {
      let rank = 0;
      let total = 0;

      switch (type) {
        case 'global':
        case 'weekly':
        case 'monthly':
          rank = await User.countDocuments({
            isBanned: false,
            totalMined: { $gt: 0 },
            $or: [
              { totalMined: { $gt: (await User.findOne({ telegramId }))?.totalMined || 0 } },
              { totalMined: (await User.findOne({ telegramId }))?.totalMined || 0, telegramId: { $ne: telegramId } },
            ],
          });
          total = await User.countDocuments({ isBanned: false, totalMined: { $gt: 0 } });
          break;

        case 'level':
          rank = await User.countDocuments({
            isBanned: false,
            $or: [
              { level: { $gt: (await User.findOne({ telegramId }))?.level || 0 } },
              { level: (await User.findOne({ telegramId }))?.level || 0, xp: { $gt: (await User.findOne({ telegramId }))?.xp || 0 }, telegramId: { $ne: telegramId } },
            ],
          });
          total = await User.countDocuments({ isBanned: false });
          break;

        case 'referral':
          rank = await User.countDocuments({
            isBanned: false,
            $or: [
              { referralCount: { $gt: (await User.findOne({ telegramId }))?.referralCount || 0 } },
              { referralCount: (await User.findOne({ telegramId }))?.referralCount || 0, totalReferralEarnings: { $gt: (await User.findOne({ telegramId }))?.totalReferralEarnings || 0 }, telegramId: { $ne: telegramId } },
            ],
          });
          total = await User.countDocuments({ isBanned: false });
          break;

        default:
          throw new Error('Invalid leaderboard type');
      }

      return {
        success: true,
        type,
        rank: rank + 1,
        total,
        percentile: total > 0 ? Math.round(((total - rank) / total) * 100) : 0,
      };

    } catch (error) {
      console.error('[LeaderboardService] Get user rank error:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard summary for user
   */
  async getUserLeaderboardSummary(telegramId) {
    try {
      const [globalRank, levelRank, referralRank] = await Promise.all([
        this.getUserRank(telegramId, 'global'),
        this.getUserRank(telegramId, 'level'),
        this.getUserRank(telegramId, 'referral'),
      ]);

      return {
        success: true,
        summary: {
          global: globalRank,
          level: levelRank,
          referral: referralRank,
        },
      };

    } catch (error) {
      console.error('[LeaderboardService] Get user summary error:', error);
      throw error;
    }
  }
}

module.exports = new LeaderboardService();
