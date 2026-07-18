const friendService = require('../services/friendService');

/**
 * Friend Controller
 * Handles friend-related endpoints
 */
class FriendController {
  /**
   * POST /api/friends/request
   * Send friend request
   */
  async sendRequest(req, res) {
    try {
      const user = req.user;
      const { friendTelegramId } = req.body;

      if (!friendTelegramId) {
        return res.status(400).json({
          success: false,
          error: 'Friend Telegram ID is required'
        });
      }

      const result = await friendService.sendFriendRequest(
        user._id.toString(),
        user.telegramId,
        friendTelegramId
      );

      return res.json(result);

    } catch (error) {
      console.error('[FriendController] Send request error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to send friend request'
      });
    }
  }

  /**
   * POST /api/friends/accept/:friendId
   * Accept friend request
   */
  async acceptRequest(req, res) {
    try {
      const user = req.user;
      const { friendId } = req.params;

      const result = await friendService.acceptFriendRequest(
        user._id.toString(),
        user.telegramId,
        friendId
      );

      return res.json(result);

    } catch (error) {
      console.error('[FriendController] Accept request error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to accept friend request'
      });
    }
  }

  /**
   * POST /api/friends/reject/:friendId
   * Reject friend request
   */
  async rejectRequest(req, res) {
    try {
      const user = req.user;
      const { friendId } = req.params;

      const result = await friendService.rejectFriendRequest(
        user._id.toString(),
        user.telegramId,
        friendId
      );

      return res.json(result);

    } catch (error) {
      console.error('[FriendController] Reject request error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to reject friend request'
      });
    }
  }

  /**
   * DELETE /api/friends/:friendId
   * Remove friend
   */
  async removeFriend(req, res) {
    try {
      const user = req.user;
      const { friendId } = req.params;

      const result = await friendService.removeFriend(
        user._id.toString(),
        user.telegramId,
        friendId
      );

      return res.json(result);

    } catch (error) {
      console.error('[FriendController] Remove friend error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to remove friend'
      });
    }
  }

  /**
   * POST /api/friends/block
   * Block user
   */
  async blockUser(req, res) {
    try {
      const user = req.user;
      const { friendTelegramId } = req.body;

      if (!friendTelegramId) {
        return res.status(400).json({
          success: false,
          error: 'Friend Telegram ID is required'
        });
      }

      const result = await friendService.blockUser(
        user._id.toString(),
        user.telegramId,
        friendTelegramId
      );

      return res.json(result);

    } catch (error) {
      console.error('[FriendController] Block user error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to block user'
      });
    }
  }

  /**
   * POST /api/friends/unblock
   * Unblock user
   */
  async unblockUser(req, res) {
    try {
      const user = req.user;
      const { friendTelegramId } = req.body;

      if (!friendTelegramId) {
        return res.status(400).json({
          success: false,
          error: 'Friend Telegram ID is required'
        });
      }

      const result = await friendService.unblockUser(
        user._id.toString(),
        user.telegramId,
        friendTelegramId
      );

      return res.json(result);

    } catch (error) {
      console.error('[FriendController] Unblock user error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to unblock user'
      });
    }
  }

  /**
   * GET /api/friends
   * Get friend list
   */
  async getFriends(req, res) {
    try {
      const user = req.user;
      const { status = 'accepted', limit = 50, offset = 0 } = req.query;

      const result = await friendService.getFriendList(
        user.telegramId,
        status,
        parseInt(limit),
        parseInt(offset)
      );

      return res.json(result);

    } catch (error) {
      console.error('[FriendController] Get friends error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get friend list'
      });
    }
  }

  /**
   * GET /api/friends/pending
   * Get pending friend requests
   */
  async getPendingRequests(req, res) {
    try {
      const user = req.user;
      const result = await friendService.getPendingRequests(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[FriendController] Get pending requests error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get pending requests'
      });
    }
  }

  /**
   * PUT /api/friends/online
   * Update online status
   */
  async updateOnlineStatus(req, res) {
    try {
      const user = req.user;
      const { isOnline } = req.body;

      const result = await friendService.updateOnlineStatus(
        user.telegramId,
        isOnline
      );

      return res.json(result);

    } catch (error) {
      console.error('[FriendController] Update online status error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update online status'
      });
    }
  }

  /**
   * GET /api/friends/search
   * Search for users
   */
  async searchUsers(req, res) {
    try {
      const { q } = req.query;
      const limit = parseInt(req.query.limit) || 20;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const result = await friendService.searchUsers(q, limit);
      return res.json(result);

    } catch (error) {
      console.error('[FriendController] Search users error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to search users'
      });
    }
  }
}

module.exports = new FriendController();
