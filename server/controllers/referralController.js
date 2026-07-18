const referralService = require('../services/referralService');

/**
 * Referral Controller
 * Handles referral-related endpoints
 */
class ReferralController {
  /**
   * GET /api/referral/info
   * Get user's referral code and statistics
   */
  async getReferralInfo(req, res) {
    try {
      const user = req.user;
      const result = await referralService.getReferralInfo(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[ReferralController] Get referral info error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get referral information'
      });
    }
  }

  /**
   * GET /api/referral/validate/:code
   * Validate a referral code
   */
  async validateCode(req, res) {
    try {
      const { code } = req.params;
      const result = await referralService.validateReferralCode(code);
      return res.json(result);

    } catch (error) {
      console.error('[ReferralController] Validate code error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate referral code'
      });
    }
  }

  /**
   * POST /api/referral/create
   * Create a referral relationship
   */
  async createReferral(req, res) {
    try {
      const user = req.user;
      const { referralCode } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!referralCode) {
        return res.status(400).json({
          success: false,
          error: 'Referral code is required'
        });
      }

      // Validate code first
      const validation = await referralService.validateReferralCode(referralCode);
      if (!validation.success) {
        return res.status(400).json(validation);
      }

      // Create referral
      const result = await referralService.createReferral(
        validation.referrer.telegramId,
        user.telegramId,
        referralCode,
        ipAddress
      );

      return res.json(result);

    } catch (error) {
      console.error('[ReferralController] Create referral error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to create referral'
      });
    }
  }

  /**
   * POST /api/referral/complete/:referralId
   * Complete a referral (when referred user performs required action)
   */
  async completeReferral(req, res) {
    try {
      const { referralId } = req.params;
      const result = await referralService.completeReferral(referralId);
      return res.json(result);

    } catch (error) {
      console.error('[ReferralController] Complete referral error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to complete referral'
      });
    }
  }

  /**
   * GET /api/referral/list
   * Get user's referral list
   */
  async getReferralList(req, res) {
    try {
      const user = req.user;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const result = await referralService.getReferralList(
        user.telegramId,
        limit,
        offset
      );

      return res.json(result);

    } catch (error) {
      console.error('[ReferralController] Get referral list error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get referral list'
      });
    }
  }

  /**
   * GET /api/referral/leaderboard
   * Get referral leaderboard
   */
  async getLeaderboard(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const result = await referralService.getReferralLeaderboard(limit);
      return res.json(result);

    } catch (error) {
      console.error('[ReferralController] Get leaderboard error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get referral leaderboard'
      });
    }
  }
}

module.exports = new ReferralController();
