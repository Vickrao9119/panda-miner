const leaderboardService = require('../services/leaderboardService');

/**
 * Leaderboard Controller
 * Handles leaderboard-related endpoints
 */
class LeaderboardController {
  /**
   * GET /api/leaderboard/global
   * Get global leaderboard
   */
  async getGlobal(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const result = await leaderboardService.getGlobalLeaderboard(limit, offset);
      return res.json(result);

    } catch (error) {
      console.error('[LeaderboardController] Get global error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get global leaderboard'
      });
    }
  }

  /**
   * GET /api/leaderboard/weekly
   * Get weekly leaderboard
   */
  async getWeekly(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const result = await leaderboardService.getWeeklyLeaderboard(limit, offset);
      return res.json(result);

    } catch (error) {
      console.error('[LeaderboardController] Get weekly error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get weekly leaderboard'
      });
    }
  }

  /**
   * GET /api/leaderboard/monthly
   * Get monthly leaderboard
   */
  async getMonthly(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const result = await leaderboardService.getMonthlyLeaderboard(limit, offset);
      return res.json(result);

    } catch (error) {
      console.error('[LeaderboardController] Get monthly error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get monthly leaderboard'
      });
    }
  }

  /**
   * GET /api/leaderboard/friends
   * Get friends leaderboard
   */
  async getFriends(req, res) {
    try {
      const user = req.user;
      const limit = parseInt(req.query.limit) || 50;
      const result = await leaderboardService.getFriendsLeaderboard(user.telegramId, limit);
      return res.json(result);

    } catch (error) {
      console.error('[LeaderboardController] Get friends error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get friends leaderboard'
      });
    }
  }

  /**
   * GET /api/leaderboard/level
   * Get top level leaderboard
   */
  async getTopLevel(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const result = await leaderboardService.getTopLevelLeaderboard(limit, offset);
      return res.json(result);

    } catch (error) {
      console.error('[LeaderboardController] Get top level error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get top level leaderboard'
      });
    }
  }

  /**
   * GET /api/leaderboard/referral
   * Get top referrers leaderboard
   */
  async getTopReferrers(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const result = await leaderboardService.getTopReferrersLeaderboard(limit, offset);
      return res.json(result);

    } catch (error) {
      console.error('[LeaderboardController] Get top referrers error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get top referrers leaderboard'
      });
    }
  }

  /**
   * GET /api/leaderboard/rank/:type
   * Get user's rank on specific leaderboard
   */
  async getUserRank(req, res) {
    try {
      const user = req.user;
      const { type = 'global' } = req.params;
      const result = await leaderboardService.getUserRank(user.telegramId, type);
      return res.json(result);

    } catch (error) {
      console.error('[LeaderboardController] Get user rank error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get user rank'
      });
    }
  }

  /**
   * GET /api/leaderboard/summary
   * Get user's leaderboard summary
   */
  async getSummary(req, res) {
    try {
      const user = req.user;
      const result = await leaderboardService.getUserLeaderboardSummary(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[LeaderboardController] Get summary error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get leaderboard summary'
      });
    }
  }
}

module.exports = new LeaderboardController();
