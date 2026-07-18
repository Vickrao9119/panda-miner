const Notification = require('../models/Notification');
const User = require('../models/User');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');

/**
 * Notification Service
 * Handles user notifications and alerts
 */
class NotificationService {
  /**
   * Create notification for user
   */
  async createNotification(userId, telegramId, type, title, message, data = {}, priority = 'normal') {
    try {
      const notification = await Notification.create({
        notificationId: uuidv4(),
        userId,
        telegramId,
        type,
        title,
        message,
        data: new Map(Object.entries(data)),
        priority,
        createdAt: new Date(),
      });

      return {
        success: true,
        notification: this.sanitizeNotification(notification),
      };

    } catch (error) {
      console.error('[NotificationService] Create notification error:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(telegramId, unreadOnly = false, limit = 20, offset = 0) {
    try {
      const query = { telegramId };
      if (unreadOnly) {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);

      const total = await Notification.countDocuments(query);

      return {
        success: true,
        notifications: notifications.map(n => this.sanitizeNotification(n)),
        total,
        limit,
        offset,
      };

    } catch (error) {
      console.error('[NotificationService] Get user notifications error:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, telegramId) {
    try {
      const notification = await Notification.findOne({ notificationId, telegramId });
      if (!notification) {
        throw new Error('Notification not found');
      }

      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();

      return {
        success: true,
        notification: this.sanitizeNotification(notification),
      };

    } catch (error) {
      console.error('[NotificationService] Mark as read error:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(telegramId) {
    try {
      const result = await Notification.updateMany(
        { telegramId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return {
        success: true,
        updatedCount: result.modifiedCount,
      };

    } catch (error) {
      console.error('[NotificationService] Mark all as read error:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, telegramId) {
    try {
      const notification = await Notification.findOneAndDelete({ notificationId, telegramId });
      if (!notification) {
        throw new Error('Notification not found');
      }

      return {
        success: true,
      };

    } catch (error) {
      console.error('[NotificationService] Delete notification error:', error);
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(telegramId) {
    try {
      const count = await Notification.countDocuments({ telegramId, isRead: false });

      return {
        success: true,
        count,
      };

    } catch (error) {
      console.error('[NotificationService] Get unread count error:', error);
      throw error;
    }
  }

  /**
   * Send daily reward notification
   */
  async sendDailyRewardReady(telegramId) {
    try {
      return await this.createNotification(
        telegramId,
        telegramId,
        'daily_reward',
        'Daily Reward Ready!',
        'Your daily reward is ready to claim. Don\'t miss out!',
        {},
        'high'
      );

    } catch (error) {
      console.error('[NotificationService] Send daily reward notification error:', error);
      throw error;
    }
  }

  /**
   * Send energy full notification
   */
  async sendEnergyFull(telegramId) {
    try {
      return await this.createNotification(
        telegramId,
        telegramId,
        'energy_full',
        'Energy Full!',
        'Your energy is fully recharged. Start mining!',
        {},
        'normal'
      );

    } catch (error) {
      console.error('[NotificationService] Send energy full notification error:', error);
      throw error;
    }
  }

  /**
   * Send mission complete notification
   */
  async sendMissionComplete(telegramId, missionTitle, reward) {
    try {
      return await this.createNotification(
        telegramId,
        telegramId,
        'mission_complete',
        'Mission Complete!',
        `You completed "${missionTitle}". Claim your reward!`,
        { reward },
        'high'
      );

    } catch (error) {
      console.error('[NotificationService] Send mission complete notification error:', error);
      throw error;
    }
  }

  /**
   * Send referral joined notification
   */
  async sendReferralJoined(telegramId, referrerName) {
    try {
      return await this.createNotification(
        telegramId,
        telegramId,
        'referral_joined',
        'New Referral!',
        `${referrerName} joined using your referral code!`,
        {},
        'high'
      );

    } catch (error) {
      console.error('[NotificationService] Send referral joined notification error:', error);
      throw error;
    }
  }

  /**
   * Send level up notification
   */
  async sendLevelUp(telegramId, newLevel) {
    try {
      return await this.createNotification(
        telegramId,
        telegramId,
        'level_up',
        'Level Up!',
        `Congratulations! You reached level ${newLevel}!`,
        { newLevel },
        'high'
      );

    } catch (error) {
      console.error('[NotificationService] Send level up notification error:', error);
      throw error;
    }
  }

  /**
   * Send achievement unlocked notification
   */
  async sendAchievementUnlocked(telegramId, achievementName) {
    try {
      return await this.createNotification(
        telegramId,
        telegramId,
        'achievement_unlocked',
        'Achievement Unlocked!',
        `You unlocked: ${achievementName}`,
        { achievementName },
        'high'
      );

    } catch (error) {
      console.error('[NotificationService] Send achievement unlocked notification error:', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true,
      });

      return {
        success: true,
        deletedCount: result.deletedCount,
      };

    } catch (error) {
      console.error('[NotificationService] Cleanup old notifications error:', error);
      throw error;
    }
  }

  /**
   * Sanitize notification for response
   */
  sanitizeNotification(notification) {
    return {
      notificationId: notification.notificationId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: Object.fromEntries(notification.data || {}),
      isRead: notification.isRead,
      readAt: notification.readAt,
      priority: notification.priority,
      createdAt: notification.createdAt,
      expiresAt: notification.expiresAt,
    };
  }
}

module.exports = new NotificationService();
