const userService = require('../services/userService');

/**
 * User Controller
 * Handles user profile-related endpoints
 */
class UserController {
  /**
   * GET /api/users/profile
   * Get user profile
   */
  async getProfile(req, res) {
    try {
      const user = req.user;
      const result = await userService.getProfile(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[UserController] Get profile error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get profile'
      });
    }
  }

  /**
   * PUT /api/users/profile
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const user = req.user;
      const updates = req.body;

      const result = await userService.updateProfile(user.telegramId, updates);
      return res.json(result);

    } catch (error) {
      console.error('[UserController] Update profile error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to update profile'
      });
    }
  }

  /**
   * GET /api/users/achievements
   * Get user achievements
   */
  async getAchievements(req, res) {
    try {
      const user = req.user;
      const result = await userService.getAchievements(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[UserController] Get achievements error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get achievements'
      });
    }
  }

  /**
   * GET /api/users/activity
   * Get user activity history
   */
  async getActivityHistory(req, res) {
    try {
      const user = req.user;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const result = await userService.getActivityHistory(user.telegramId, limit, offset);
      return res.json(result);

    } catch (error) {
      console.error('[UserController] Get activity history error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get activity history'
      });
    }
  }

  /**
   * GET /api/users/stats
   * Get user statistics summary
   */
  async getStatsSummary(req, res) {
    try {
      const user = req.user;
      const result = await userService.getStatsSummary(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[UserController] Get stats summary error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get stats summary'
      });
    }
  }

  /**
   * DELETE /api/users/account
   * Delete user account
   */
  async deleteAccount(req, res) {
    try {
      const user = req.user;
      const result = await userService.deleteAccount(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[UserController] Delete account error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete account'
      });
    }
  }
}

module.exports = new UserController();
