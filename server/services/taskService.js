const Task = require('../models/Task');
const Mission = require('../models/Mission');
const User = require('../models/User');
const ClaimHistory = require('../models/ClaimHistory');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');

/**
 * Task Service
 * Handles tasks and missions system
 */
class TaskService {
  /**
   * Get available tasks for a user
   */
  async getAvailableTasks(telegramId, category = null) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      const query = { isActive: true };
      if (category) {
        query.category = category;
      }

      const tasks = await Task.find(query).sort({ priority: -1, taskId: 1 });

      const availableTasks = tasks.map(task => {
        const isCompleted = user.completedTasks.includes(task.taskId);
        const canComplete = !isCompleted && user.level >= task.requiredLevel;

        return {
          taskId: task.taskId,
          title: task.title,
          description: task.description,
          taskType: task.taskType,
          targetUrl: task.targetUrl,
          targetChannel: task.targetChannel,
          targetCount: task.targetCount,
          rewardCoins: task.rewardCoins,
          rewardXP: task.rewardXP,
          rewardBoost: task.rewardBoost,
          isDaily: task.isDaily,
          isOneTime: task.isOneTime,
          requiredLevel: task.requiredLevel,
          category: task.category,
          icon: task.icon,
          difficulty: task.difficulty,
          isCompleted,
          canComplete,
        };
      });

      return {
        success: true,
        tasks: availableTasks,
        completedCount: user.completedTasks.length,
      };

    } catch (error) {
      console.error('[TaskService] Get available tasks error:', error);
      throw error;
    }
  }

  /**
   * Complete a task
   */
  async completeTask(userId, telegramId, taskId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      // Check if task already completed
      if (user.completedTasks.includes(taskId)) {
        throw new Error('Task already completed');
      }

      // Get task details
      const task = await Task.findOne({ taskId, isActive: true });
      if (!task) {
        throw new Error('Task not found');
      }

      // Check level requirement
      if (user.level < task.requiredLevel) {
        throw new Error('Level requirement not met');
      }

      // Mark task as completed
      user.completedTasks.push(taskId);
      
      // Apply rewards
      if (task.rewardCoins > 0) {
        user.coins += task.rewardCoins;
        user.totalMined += task.rewardCoins;
      }
      if (task.rewardXP > 0) {
        user.xp += task.rewardXP;
      }
      if (task.rewardBoost) {
        // Add boost to user
        if (!user.activeBoosts) user.activeBoosts = new Map();
        // Boost will be activated separately
      }

      await user.save();

      // Log claim
      await this.logTaskCompletion(user, task);

      // If it's a daily task, reset at midnight
      if (task.isDaily) {
        // Schedule reset (handled by cron job)
      }

      return {
        success: true,
        taskId,
        rewardCoins: task.rewardCoins,
        rewardXP: task.rewardXP,
        rewardBoost: task.rewardBoost,
        state: this.getUserState(user),
      };

    } catch (error) {
      console.error('[TaskService] Complete task error:', error);
      throw error;
    }
  }

  /**
   * Get available missions for a user
   */
  async getAvailableMissions(telegramId, category = null) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      const query = { 
        userId: user._id.toString(),
        isActive: true,
        endTime: { $gt: new Date() }
      };
      
      if (category) {
        query.category = category;
      }

      const missions = await Mission.find(query).sort({ priority: -1, startTime: 1 });

      const availableMissions = missions.map(mission => ({
        missionId: mission.missionId,
        title: mission.title,
        description: mission.description,
        missionType: mission.missionType,
        targetValue: mission.targetValue,
        currentValue: mission.currentValue,
        progress: Math.min(100, (mission.currentValue / mission.targetValue) * 100),
        rewardCoins: mission.rewardCoins,
        rewardXP: mission.rewardXP,
        rewardItems: mission.rewardItems,
        startTime: mission.startTime,
        endTime: mission.endTime,
        isCompleted: mission.isCompleted,
        isClaimed: mission.isClaimed,
        category: mission.category,
        icon: mission.icon,
      }));

      return {
        success: true,
        missions: availableMissions,
      };

    } catch (error) {
      console.error('[TaskService] Get available missions error:', error);
      throw error;
    }
  }

  /**
   * Create a mission for a user
   */
  async createMission(userId, telegramId, missionData) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      const mission = await Mission.create({
        missionId: uuidv4(),
        ...missionData,
        userId: user._id.toString(),
        telegramId: user.telegramId,
        isActive: true,
        isCompleted: false,
        isClaimed: false,
      });

      return {
        success: true,
        mission,
      };

    } catch (error) {
      console.error('[TaskService] Create mission error:', error);
      throw error;
    }
  }

  /**
   * Update mission progress
   */
  async updateMissionProgress(missionId, increment = 1) {
    try {
      const mission = await Mission.findOne({ missionId, isActive: true });
      if (!mission) {
        throw new Error('Mission not found');
      }

      if (mission.isCompleted) {
        return { success: true, mission };
      }

      mission.currentValue = Math.min(mission.targetValue, mission.currentValue + increment);

      // Check if mission is completed
      if (mission.currentValue >= mission.targetValue) {
        mission.isCompleted = true;
      }

      await mission.save();

      return {
        success: true,
        mission,
      };

    } catch (error) {
      console.error('[TaskService] Update mission progress error:', error);
      throw error;
    }
  }

  /**
   * Claim mission reward
   */
  async claimMissionReward(userId, telegramId, missionId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      const mission = await Mission.findOne({ missionId, userId: user._id.toString() });
      if (!mission) {
        throw new Error('Mission not found');
      }

      if (!mission.isCompleted) {
        throw new Error('Mission not completed');
      }

      if (mission.isClaimed) {
        throw new Error('Reward already claimed');
      }

      // Apply rewards
      if (mission.rewardCoins > 0) {
        user.coins += mission.rewardCoins;
        user.totalMined += mission.rewardCoins;
      }
      if (mission.rewardXP > 0) {
        user.xp += mission.rewardXP;
      }
      if (mission.rewardItems && mission.rewardItems.length > 0) {
        mission.rewardItems.forEach(item => {
          if (!user.badges.includes(item)) {
            user.badges.push(item);
          }
        });
      }

      // Mark as claimed
      mission.isClaimed = true;
      user.completedMissions.push(missionId);

      await user.save();
      await mission.save();

      // Log claim
      await this.logMissionClaim(user, mission);

      return {
        success: true,
        missionId,
        rewardCoins: mission.rewardCoins,
        rewardXP: mission.rewardXP,
        rewardItems: mission.rewardItems,
        state: this.getUserState(user),
      };

    } catch (error) {
      console.error('[TaskService] Claim mission reward error:', error);
      throw error;
    }
  }

  /**
   * Reset daily tasks for a user
   */
  async resetDailyTasks(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      const dailyTasks = await Task.find({ isDaily: true, isActive: true });
      const dailyTaskIds = dailyTasks.map(t => t.taskId);

      // Remove daily tasks from completed list
      user.completedTasks = user.completedTasks.filter(
        taskId => !dailyTaskIds.includes(taskId)
      );

      await user.save();

      return {
        success: true,
        resetCount: dailyTaskIds.length,
      };

    } catch (error) {
      console.error('[TaskService] Reset daily tasks error:', error);
      throw error;
    }
  }

  /**
   * Get user state for response
   */
  getUserState(user) {
    return {
      coins: user.coins,
      xp: user.xp,
      level: user.level,
      completedTasks: user.completedTasks,
      completedMissions: user.completedMissions,
      badges: user.badges,
    };
  }

  /**
   * Log task completion
   */
  async logTaskCompletion(user, task) {
    try {
      await ClaimHistory.create({
        claimId: uuidv4(),
        userId: user._id.toString(),
        telegramId: user.telegramId,
        claimType: 'task',
        coinsEarned: task.rewardCoins,
        xpEarned: task.rewardXP,
        relatedTaskId: task.taskId,
        claimedAt: new Date(),
      });

      await Log.create({
        logId: uuidv4(),
        level: 'info',
        category: 'task',
        message: `Task completed: ${task.title}`,
        telegramId: user.telegramId,
        metadata: new Map([
          ['taskId', task.taskId],
          ['rewardCoins', task.rewardCoins],
          ['rewardXP', task.rewardXP],
        ]),
      });
    } catch (error) {
      console.error('[TaskService] Failed to log task completion:', error);
    }
  }

  /**
   * Log mission claim
   */
  async logMissionClaim(user, mission) {
    try {
      await ClaimHistory.create({
        claimId: uuidv4(),
        userId: user._id.toString(),
        telegramId: user.telegramId,
        claimType: 'mission',
        coinsEarned: mission.rewardCoins,
        xpEarned: mission.rewardXP,
        itemsEarned: mission.rewardItems,
        relatedMissionId: mission.missionId,
        claimedAt: new Date(),
      });

      await Log.create({
        logId: uuidv4(),
        level: 'info',
        category: 'mission',
        message: `Mission reward claimed: ${mission.title}`,
        telegramId: user.telegramId,
        metadata: new Map([
          ['missionId', mission.missionId],
          ['rewardCoins', mission.rewardCoins],
          ['rewardXP', mission.rewardXP],
        ]),
      });
    } catch (error) {
      console.error('[TaskService] Failed to log mission claim:', error);
    }
  }

  /**
   * Get task categories
   */
  async getTaskCategories() {
    try {
      const categories = await Task.distinct('category');
      return {
        success: true,
        categories,
      };
    } catch (error) {
      console.error('[TaskService] Get task categories error:', error);
      throw error;
    }
  }
}

module.exports = new TaskService();
