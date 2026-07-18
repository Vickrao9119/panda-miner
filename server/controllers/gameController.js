const gameService = require('../services/gameService');

/**
 * Game Controller
 * Handles all game-related endpoints
 */
class GameController {
  /**
   * POST /api/game/mine
   * Process a mining tap
   */
  async mine(req, res) {
    try {
      const user = req.user;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await gameService.processMining(
        user._id.toString(),
        user.telegramId,
        ipAddress,
        userAgent
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);

    } catch (error) {
      console.error('[GameController] Mine error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Mining failed'
      });
    }
  }

  /**
   * GET /api/game/state
   * Get current user state
   */
  async getState(req, res) {
    try {
      const user = req.user;
      const result = await gameService.getUserState(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[GameController] Get state error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get state'
      });
    }
  }

  /**
   * POST /api/game/chest
   * Claim chest reward
   */
  async claimChest(req, res) {
    try {
      const user = req.user;
      const result = await gameService.claimChest(user._id.toString(), user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[GameController] Claim chest error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to claim chest'
      });
    }
  }

  /**
   * POST /api/game/mystery-box
   * Open mystery box
   */
  async openMysteryBox(req, res) {
    try {
      const user = req.user;
      const result = await gameService.openMysteryBox(user._id.toString(), user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[GameController] Open mystery box error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to open mystery box'
      });
    }
  }

  /**
   * POST /api/game/daily-reward
   * Claim daily reward
   */
  async claimDailyReward(req, res) {
    try {
      const user = req.user;
      const result = await gameService.claimDailyReward(user._id.toString(), user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[GameController] Claim daily reward error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to claim daily reward'
      });
    }
  }

  /**
   * POST /api/game/offline-earnings
   * Claim offline earnings
   */
  async claimOfflineEarnings(req, res) {
    try {
      const user = req.user;
      const result = await gameService.claimOfflineEarnings(user._id.toString(), user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[GameController] Claim offline earnings error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to claim offline earnings'
      });
    }
  }

  /**
   * GET /api/game/stats
   * Get user statistics
   */
  async getStats(req, res) {
    try {
      const user = req.user;
      const result = await gameService.getUserStats(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[GameController] Get stats error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get statistics'
      });
    }
  }
}

module.exports = new GameController();
