const taskService = require('../services/taskService');

/**
 * Task Controller
 * Handles task and mission-related endpoints
 */
class TaskController {
  /**
   * GET /api/tasks
   * Get available tasks for user
   */
  async getTasks(req, res) {
    try {
      const user = req.user;
      const { category } = req.query;
      const result = await taskService.getAvailableTasks(user.telegramId, category);
      return res.json(result);

    } catch (error) {
      console.error('[TaskController] Get tasks error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get tasks'
      });
    }
  }

  /**
   * POST /api/tasks/:taskId/complete
   * Complete a task
   */
  async completeTask(req, res) {
    try {
      const user = req.user;
      const { taskId } = req.params;
      const result = await taskService.completeTask(
        user._id.toString(),
        user.telegramId,
        taskId
      );
      return res.json(result);

    } catch (error) {
      console.error('[TaskController] Complete task error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to complete task'
      });
    }
  }

  /**
   * GET /api/tasks/categories
   * Get task categories
   */
  async getCategories(req, res) {
    try {
      const result = await taskService.getTaskCategories();
      return res.json(result);

    } catch (error) {
      console.error('[TaskController] Get categories error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get categories'
      });
    }
  }

  /**
   * GET /api/missions
   * Get available missions for user
   */
  async getMissions(req, res) {
    try {
      const user = req.user;
      const { category } = req.query;
      const result = await taskService.getAvailableMissions(user.telegramId, category);
      return res.json(result);

    } catch (error) {
      console.error('[TaskController] Get missions error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get missions'
      });
    }
  }

  /**
   * POST /api/missions
   * Create a mission (admin only)
   */
  async createMission(req, res) {
    try {
      const user = req.user;
      if (!user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { telegramId, missionData } = req.body;
      const result = await taskService.createMission(telegramId, missionData);
      return res.json(result);

    } catch (error) {
      console.error('[TaskController] Create mission error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to create mission'
      });
    }
  }

  /**
   * POST /api/missions/:missionId/progress
   * Update mission progress
   */
  async updateProgress(req, res) {
    try {
      const { missionId } = req.params;
      const { increment } = req.body;
      const result = await taskService.updateMissionProgress(missionId, increment || 1);
      return res.json(result);

    } catch (error) {
      console.error('[TaskController] Update progress error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to update progress'
      });
    }
  }

  /**
   * POST /api/missions/:missionId/claim
   * Claim mission reward
   */
  async claimReward(req, res) {
    try {
      const user = req.user;
      const { missionId } = req.params;
      const result = await taskService.claimMissionReward(
        user._id.toString(),
        user.telegramId,
        missionId
      );
      return res.json(result);

    } catch (error) {
      console.error('[TaskController] Claim reward error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to claim reward'
      });
    }
  }

  /**
   * POST /api/tasks/reset-daily
   * Reset daily tasks (admin or cron)
   */
  async resetDaily(req, res) {
    try {
      const { telegramId } = req.body;
      const result = await taskService.resetDailyTasks(telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[TaskController] Reset daily error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reset daily tasks'
      });
    }
  }
}

module.exports = new TaskController();
