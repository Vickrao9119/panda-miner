const Admin = require('../models/Admin');
const User = require('../models/User');
const Task = require('../models/Task');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

/**
 * Admin Service
 * Handles admin panel operations: user management, statistics, tasks, notifications
 */
class AdminService {
  /**
   * Create admin account
   */
  async createAdmin(adminData) {
    try {
      const { name, username, email, password, permissions = ['full_access'] } = adminData;

      // Check if admin already exists
      const existingAdmin = await Admin.findOne({ $or: [{ email }, { telegramId: username }] });
      if (existingAdmin) {
        throw new Error('Admin already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const admin = await Admin.create({
        adminId: uuidv4(),
        name,
        username,
        email,
        passwordHash,
        permissions,
        isActive: true,
        isSuperAdmin: permissions.includes('full_access'),
        createdAt: new Date(),
      });

      // Log admin creation
      await this.logAdminActivity(admin.adminId, 'admin_created', { email });

      return {
        success: true,
        admin: this.sanitizeAdmin(admin),
      };

    } catch (error) {
      console.error('[AdminService] Create admin error:', error);
      throw error;
    }
  }

  /**
   * Verify admin credentials
   */
  async verifyAdmin(email, password) {
    try {
      const admin = await Admin.findOne({ email, isActive: true });
      if (!admin) {
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (admin.lockedUntil && new Date(admin.lockedUntil) > new Date()) {
        throw new Error('Account locked. Try again later');
      }

      const isValid = await bcrypt.compare(password, admin.passwordHash);
      if (!isValid) {
        // Increment login attempts
        admin.loginAttempts += 1;
        
        // Lock account after 5 failed attempts
        if (admin.loginAttempts >= 5) {
          admin.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        }
        
        await admin.save();
        throw new Error('Invalid credentials');
      }

      // Reset login attempts on success
      admin.loginAttempts = 0;
      admin.lastLogin = new Date();
      await admin.save();

      return {
        success: true,
        admin: this.sanitizeAdmin(admin),
      };

    } catch (error) {
      console.error('[AdminService] Verify admin error:', error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      const [
        totalUsers,
        activeUsers,
        totalCoins,
        totalMining,
        todaySignups,
        pendingWithdrawals,
      ] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ lastActiveTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
        User.aggregate([{ $group: { _id: null, total: { $sum: '$coins' } } }]),
        User.aggregate([{ $group: { _id: null, total: { $sum: '$totalMined' } } }),
        User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
        require('../models/Transaction').countDocuments({ type: 'withdrawal', status: 'pending' }),
      ]);

      return {
        success: true,
        stats: {
          totalUsers,
          activeUsers,
          totalCoins: totalCoins[0]?.total || 0,
          totalMining: totalMining[0]?.total || 0,
          todaySignups,
          pendingWithdrawals,
        },
      };

    } catch (error) {
      console.error('[AdminService] Get dashboard stats error:', error);
      throw error;
    }
  }

  /**
   * Get user list with pagination
   */
  async getUserList(limit = 50, offset = 0, filters = {}) {
    try {
      const query = {};
      
      if (filters.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { username: { $regex: filters.search, $options: 'i' } },
          { telegramId: filters.search },
        ];
      }

      if (filters.isBanned !== undefined) {
        query.isBanned = filters.isBanned;
      }

      if (filters.minLevel) {
        query.level = { $gte: filters.minLevel };
      }

      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .select('telegramId firstName username coins totalMined level isBanned isAdmin createdAt lastActiveTime');

      const total = await User.countDocuments(query);

      return {
        success: true,
        users: users.map(u => ({
          telegramId: u.telegramId,
          firstName: u.firstName,
          username: u.username,
          coins: u.coins,
          totalMined: u.totalMined,
          level: u.level,
          isBanned: u.isBanned,
          isAdmin: u.isAdmin,
          createdAt: u.createdAt,
          lastActiveTime: u.lastActiveTime,
        })),
        total,
        limit,
        offset,
      };

    } catch (error) {
      console.error('[AdminService] Get user list error:', error);
      throw error;
    }
  }

  /**
   * Ban user
   */
  async banUser(telegramId, reason, durationHours = null) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      if (user.isAdmin) {
        throw new Error('Cannot ban admin user');
      }

      user.isBanned = true;
      user.banReason = reason;
      
      if (durationHours) {
        user.banExpiry = new Date(Date.now() + durationHours * 60 * 60 * 1000);
      } else {
        user.banExpiry = null; // Permanent ban
      }

      await user.save();

      // Log ban action
      await this.logAdminActivity('system', 'user_banned', { telegramId, reason, durationHours });

      return {
        success: true,
        user: {
          telegramId: user.telegramId,
          firstName: user.firstName,
          isBanned: user.isBanned,
          banReason: user.banReason,
          banExpiry: user.banExpiry,
        },
      };

    } catch (error) {
      console.error('[AdminService] Ban user error:', error);
      throw error;
    }
  }

  /**
   * Unban user
   */
  async unbanUser(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      user.isBanned = false;
      user.banReason = null;
      user.banExpiry = null;

      await user.save();

      // Log unban action
      await this.logAdminActivity('system', 'user_unbanned', { telegramId });

      return {
        success: true,
        user: {
          telegramId: user.telegramId,
          firstName: user.firstName,
          isBanned: user.isBanned,
        },
      };

    } catch (error) {
      console.error('[AdminService] Unban user error:', error);
      throw error;
    }
  }

  /**
   * Edit user coins
   */
  async editUserCoins(telegramId, coins, reason) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      user.coins = coins;
      if (coins > user.maxCoins) {
        user.maxCoins = coins;
      }

      await user.save();

      // Log coin edit
      await this.logAdminActivity('system', 'user_coins_edited', { telegramId, coins, reason });

      return {
        success: true,
        user: {
          telegramId: user.telegramId,
          firstName: user.firstName,
          coins: user.coins,
        },
      };

    } catch (error) {
      console.error('[AdminService] Edit user coins error:', error);
      throw error;
    }
  }

  /**
   * Edit user XP
   */
  async editUserXP(telegramId, xp, reason) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      user.xp = xp;
      
      // Recalculate level
      while (user.xp >= this.xpForLevel(user.level)) {
        user.xp -= this.xpForLevel(user.level);
        user.level += 1;
      }

      await user.save();

      // Log XP edit
      await this.logAdminActivity('system', 'user_xp_edited', { telegramId, xp, reason });

      return {
        success: true,
        user: {
          telegramId: user.telegramId,
          firstName: user.firstName,
          xp: user.xp,
          level: user.level,
        },
      };

    } catch (error) {
      console.error('[AdminService] Edit user XP error:', error);
      throw error;
    }
  }

  /**
   * Create task
   */
  async createTask(taskData) {
    try {
      const task = await Task.create({
        taskId: uuidv4(),
        ...taskData,
        isActive: true,
      });

      // Log task creation
      await this.logAdminActivity('system', 'task_created', { taskId: task.taskId, title: task.title });

      return {
        success: true,
        task,
      };

    } catch (error) {
      console.error('[AdminService] Create task error:', error);
      throw error;
    }
  }

  /**
   * Update task
   */
  async updateTask(taskId, taskData) {
    try {
      const task = await Task.findOneAndUpdate(
        { taskId },
        { ...taskData },
        { new: true }
      );

      if (!task) {
        throw new Error('Task not found');
      }

      // Log task update
      await this.logAdminActivity('system', 'task_updated', { taskId, title: task.title });

      return {
        success: true,
        task,
      };

    } catch (error) {
      console.error('[AdminService] Update task error:', error);
      throw error;
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    try {
      const task = await Task.findOneAndDelete({ taskId });
      if (!task) {
        throw new Error('Task not found');
      }

      // Log task deletion
      await this.logAdminActivity('system', 'task_deleted', { taskId, title: task.title });

      return {
        success: true,
      };

    } catch (error) {
      console.error('[AdminService] Delete task error:', error);
      throw error;
    }
  }

  /**
   * Get system logs
   */
  async getSystemLogs(level = null, category = null, limit = 100, offset = 0) {
    try {
      const query = {};
      if (level) query.level = level;
      if (category) query.category = category;

      const logs = await Log.find(query)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit);

      const total = await Log.countDocuments(query);

      return {
        success: true,
        logs: logs.map(l => ({
          logId: l.logId,
          level: l.level,
          category: l.category,
          message: l.message,
          telegramId: l.telegramId,
          metadata: Object.fromEntries(l.metadata || {}),
          timestamp: l.timestamp,
        })),
        total,
        limit,
        offset,
      };

    } catch (error) {
      console.error('[AdminService] Get system logs error:', error);
      throw error;
    }
  }

  /**
   * Send notification to user
   */
  async sendNotification(telegramId, type, title, message, data = {}) {
    try {
      const Notification = require('../models/Notification');
      
      const notification = await Notification.create({
        notificationId: uuidv4(),
        userId: telegramId,
        telegramId,
        type,
        title,
        message,
        data: new Map(Object.entries(data)),
        createdAt: new Date(),
      });

      // Log notification
      await this.logAdminActivity('system', 'notification_sent', { telegramId, type });

      return {
        success: true,
        notification,
      };

    } catch (error) {
      console.error('[AdminService] Send notification error:', error);
      throw error;
    }
  }

  /**
   * Send broadcast notification to all users
   */
  async sendBroadcast(type, title, message, data = {}) {
    try {
      const Notification = require('../models/Notification');
      const users = await User.find({}, { telegramId: 1 });

      const notifications = await Notification.insertMany(
        users.map(user => ({
          notificationId: uuidv4(),
          userId: user.telegramId,
          telegramId: user.telegramId,
          type,
          title,
          message,
          data: new Map(Object.entries(data)),
          createdAt: new Date(),
        }))
      );

      // Log broadcast
      await this.logAdminActivity('system', 'broadcast_sent', { type, recipientCount: notifications.length });

      return {
        success: true,
        recipientCount: notifications.length,
      };

    } catch (error) {
      console.error('[AdminService] Send broadcast error:', error);
      throw error;
    }
  }

  /**
   * XP required for level
   */
  xpForLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Sanitize admin for response
   */
  sanitizeAdmin(admin) {
    return {
      adminId: admin.adminId,
      name: admin.name,
      username: admin.username,
      email: admin.email,
      permissions: admin.permissions,
      isActive: admin.isActive,
      isSuperAdmin: admin.isSuperAdmin,
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt,
    };
  }

  /**
   * Log admin activity
   */
  async logAdminActivity(adminId, action, metadata = {}) {
    try {
      await Log.create({
        logId: uuidv4(),
        level: 'info',
        category: 'admin',
        message: `Admin ${action}`,
        metadata: new Map(Object.entries({ adminId, ...metadata })),
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[AdminService] Failed to log admin activity:', error);
    }
  }
}

module.exports = new AdminService();
