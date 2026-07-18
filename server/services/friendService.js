const Friend = require('../models/Friend');
const User = require('../models/User');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');

/**
 * Friend Service
 * Handles friend system: add, remove, list, status
 */
class FriendService {
  /**
   * Send friend request
   */
  async sendFriendRequest(userId, telegramId, friendTelegramId) {
    try {
      // Check if trying to add self
      if (telegramId === friendTelegramId) {
        throw new Error('Cannot add yourself as a friend');
      }

      // Check if friend exists
      const friendUser = await User.findOne({ telegramId: friendTelegramId });
      if (!friendUser) {
        throw new Error('User not found');
      }

      // Check if already friends
      const existingFriend = await Friend.findOne({
        userId: userId,
        friendTelegramId: friendTelegramId,
      });

      if (existingFriend) {
        if (existingFriend.status === 'accepted') {
          throw new Error('Already friends');
        }
        if (existingFriend.status === 'pending') {
          throw new Error('Friend request already sent');
        }
        if (existingFriend.status === 'blocked') {
          throw new Error('User is blocked');
        }
      }

      // Create friend request
      const friend = await Friend.create({
        friendId: uuidv4(),
        userId,
        friendId: friendUser._id.toString(),
        friendTelegramId,
        friendName: friendUser.firstName,
        friendUsername: friendUser.username,
        friendAvatar: friendUser.photoUrl,
        status: 'pending',
        requestedAt: new Date(),
      });

      // Log friend request
      await this.logFriendActivity(userId, friendTelegramId, 'request_sent');

      return {
        success: true,
        friend,
      };

    } catch (error) {
      console.error('[FriendService] Send friend request error:', error);
      throw error;
    }
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(userId, telegramId, friendId) {
    try {
      const friend = await Friend.findOne({ friendId, friendTelegramId: telegramId });
      if (!friend) {
        throw new Error('Friend request not found');
      }

      if (friend.status !== 'pending') {
        throw new Error('Friend request already processed');
      }

      // Update status
      friend.status = 'accepted';
      friend.acceptedAt = new Date();
      await friend.save();

      // Create reverse friendship
      const user = await User.findOne({ telegramId });
      const reverseFriend = await Friend.create({
        friendId: uuidv4(),
        userId: friend.userId,
        friendId: user._id.toString(),
        friendTelegramId: telegramId,
        friendName: user.firstName,
        friendUsername: user.username,
        friendAvatar: user.photoUrl,
        status: 'accepted',
        acceptedAt: new Date(),
      });

      // Log acceptance
      await this.logFriendActivity(userId, friend.friendTelegramId, 'request_accepted');

      return {
        success: true,
        friend,
      };

    } catch (error) {
      console.error('[FriendService] Accept friend request error:', error);
      throw error;
    }
  }

  /**
   * Reject friend request
   */
  async rejectFriendRequest(userId, telegramId, friendId) {
    try {
      const friend = await Friend.findOne({ friendId, friendTelegramId: telegramId });
      if (!friend) {
        throw new Error('Friend request not found');
      }

      if (friend.status !== 'pending') {
        throw new Error('Friend request already processed');
      }

      // Delete the request
      await Friend.deleteOne({ friendId });

      // Log rejection
      await this.logFriendActivity(userId, friend.friendTelegramId, 'request_rejected');

      return {
        success: true,
      };

    } catch (error) {
      console.error('[FriendService] Reject friend request error:', error);
      throw error;
    }
  }

  /**
   * Remove friend
   */
  async removeFriend(userId, telegramId, friendId) {
    try {
      const friend = await Friend.findOne({ friendId, userId });
      if (!friend) {
        throw new Error('Friend not found');
      }

      // Remove friendship (both directions)
      await Friend.deleteMany({
        $or: [
          { friendId },
          { userId: friend.friendId, friendId: userId },
        ],
      });

      // Log removal
      await this.logFriendActivity(userId, friend.friendTelegramId, 'friend_removed');

      return {
        success: true,
      };

    } catch (error) {
      console.error('[FriendService] Remove friend error:', error);
      throw error;
    }
  }

  /**
   * Block user
   */
  async blockUser(userId, telegramId, friendTelegramId) {
    try {
      // Check if friend exists
      const friend = await Friend.findOne({
        userId,
        friendTelegramId,
      });

      if (friend) {
        friend.status = 'blocked';
        await friend.save();
      } else {
        // Create blocked entry
        const user = await User.findOne({ telegramId: friendTelegramId });
        if (user) {
          await Friend.create({
            friendId: uuidv4(),
            userId,
            friendId: user._id.toString(),
            friendTelegramId,
            friendName: user.firstName,
            friendUsername: user.username,
            friendAvatar: user.photoUrl,
            status: 'blocked',
          });
        }
      }

      // Log block
      await this.logFriendActivity(userId, friendTelegramId, 'user_blocked');

      return {
        success: true,
      };

    } catch (error) {
      console.error('[FriendService] Block user error:', error);
      throw error;
    }
  }

  /**
   * Unblock user
   */
  async unblockUser(userId, telegramId, friendTelegramId) {
    try {
      await Friend.deleteOne({
        userId,
        friendTelegramId,
        status: 'blocked',
      });

      // Log unblock
      await this.logFriendActivity(userId, friendTelegramId, 'user_unblocked');

      return {
        success: true,
      };

    } catch (error) {
      console.error('[FriendService] Unblock user error:', error);
      throw error;
    }
  }

  /**
   * Get friend list
   */
  async getFriendList(telegramId, status = 'accepted', limit = 50, offset = 0) {
    try {
      const query = { userId: telegramId };
      if (status !== 'all') {
        query.status = status;
      }

      const friends = await Friend.find(query)
        .sort({ acceptedAt: -1, requestedAt: -1 })
        .skip(offset)
        .limit(limit);

      const total = await Friend.countDocuments(query);

      return {
        success: true,
        friends: friends.map(f => ({
          friendId: f.friendId,
          friendName: f.friendName,
          friendUsername: f.friendUsername,
          friendAvatar: f.friendAvatar,
          status: f.status,
          isOnline: f.isOnline,
          lastSeen: f.lastSeen,
          miningBonus: f.miningBonus,
          requestedAt: f.requestedAt,
          acceptedAt: f.acceptedAt,
        })),
        total,
        limit,
        offset,
      };

    } catch (error) {
      console.error('[FriendService] Get friend list error:', error);
      throw error;
    }
  }

  /**
   * Get pending friend requests
   */
  async getPendingRequests(telegramId) {
    try {
      const requests = await Friend.find({
        friendTelegramId: telegramId,
        status: 'pending',
      }).sort({ requestedAt: -1 });

      return {
        success: true,
        requests: requests.map(r => ({
          friendId: r.friendId,
          userId: r.userId,
          friendName: r.friendName,
          friendUsername: r.friendUsername,
          friendAvatar: r.friendAvatar,
          requestedAt: r.requestedAt,
        })),
      };

    } catch (error) {
      console.error('[FriendService] Get pending requests error:', error);
      throw error;
    }
  }

  /**
   * Update friend online status
   */
  async updateOnlineStatus(telegramId, isOnline) {
    try {
      await Friend.updateMany(
        { friendTelegramId: telegramId },
        {
          isOnline,
          lastSeen: isOnline ? null : new Date(),
        }
      );

      return {
        success: true,
      };

    } catch (error) {
      console.error('[FriendService] Update online status error:', error);
      throw error;
    }
  }

  /**
   * Add mining bonus from friend
   */
  async addMiningBonus(friendTelegramId, amount) {
    try {
      const friends = await Friend.find({
        friendTelegramId,
        status: 'accepted',
      });

      for (const friend of friends) {
        friend.miningBonus += amount;
        await friend.save();
      }

      return {
        success: true,
        affectedFriends: friends.length,
      };

    } catch (error) {
      console.error('[FriendService] Add mining bonus error:', error);
      throw error;
    }
  }

  /**
   * Search for users by username
   */
  async searchUsers(query, limit = 20) {
    try {
      const users = await User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { firstName: { $regex: query, $options: 'i' } },
        ],
      })
        .select('telegramId firstName username photoUrl')
        .limit(limit);

      return {
        success: true,
        users: users.map(u => ({
          telegramId: u.telegramId,
          firstName: u.firstName,
          username: u.username,
          photoUrl: u.photoUrl,
        })),
      };

    } catch (error) {
      console.error('[FriendService] Search users error:', error);
      throw error;
    }
  }

  /**
   * Log friend activity
   */
  async logFriendActivity(userId, friendTelegramId, action) {
    try {
      await Log.create({
        logId: uuidv4(),
        level: 'info',
        category: 'friends',
        message: `Friend ${action}`,
        telegramId: userId,
        metadata: new Map([
          ['friendTelegramId', friendTelegramId],
          ['action', action],
        ]),
      });
    } catch (error) {
      console.error('[FriendService] Failed to log friend activity:', error);
    }
  }
}

module.exports = new FriendService();
