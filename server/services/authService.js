const crypto = require('crypto');
const User = require('../models/User');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');

/**
 * Authentication Service
 * Handles Telegram WebApp authentication, user creation, and session management
 */
class AuthService {
  constructor() {
    this.BOT_TOKEN = null; // Will be set from environment
  }

  /**
   * Initialize service with environment variables
   */
  init() {
    this.BOT_TOKEN = process.env.BOT_TOKEN;
    if (!this.BOT_TOKEN) {
      console.error('[AuthService] BOT_TOKEN not configured');
    }
  }

  /**
   * Verify Telegram initData according to Telegram's official algorithm
   * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   */
  async verifyInitData(initData) {
    if (!initData) {
      throw new Error('Missing initData');
    }

    if (!this.BOT_TOKEN) {
      throw new Error('Server misconfigured: BOT_TOKEN not set');
    }

    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');

      if (!hash) {
        throw new Error('Invalid initData: no hash');
      }

      params.delete('hash');

      // Create data check string
      const dataCheckArr = [];
      for (const [key, value] of [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        dataCheckArr.push(`${key}=${value}`);
      }
      const dataCheckString = dataCheckArr.join('\n');

      // Compute hash
      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(this.BOT_TOKEN).digest();
      const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      if (computedHash !== hash) {
        throw new Error('Invalid initData: hash mismatch');
      }

      // Check auth_date (reject stale initData older than 24 hours)
      const authDate = parseInt(params.get('auth_date') || '0', 10);
      const ageSeconds = Date.now() / 1000 - authDate;
      if (authDate && ageSeconds > 86400) {
        throw new Error('initData expired');
      }

      // Extract user data
      const userJson = params.get('user');
      if (!userJson) {
        throw new Error('Invalid initData: no user');
      }

      const userData = JSON.parse(userJson);

      return {
        isValid: true,
        user: userData,
        authDate: authDate
      };
    } catch (error) {
      await this.logAuthError('verifyInitData', error.message, null);
      throw error;
    }
  }

  /**
   * Check if dev mode is enabled
   */
  isDevMode() {
    const NODE_ENV = process.env.NODE_ENV || 'development';
    const ALLOW_DEV_AUTH = process.env.ALLOW_DEV_AUTH;
    return NODE_ENV !== 'production' && ALLOW_DEV_AUTH === 'true';
  }

  /**
   * Create or get user from Telegram data
   */
  async findOrCreateUser(telegramUserData, ipAddress = null, deviceInfo = null) {
    const telegramId = String(telegramUserData.id);

    try {
      // Try to find existing user
      let user = await User.findOne({ telegramId });

      if (!user) {
        // Create new user
        const referralCode = User.generateReferralCode();
        
        user = await User.create({
          telegramId,
          firstName: telegramUserData.first_name || 'Miner',
          lastName: telegramUserData.last_name || null,
          username: telegramUserData.username || null,
          languageCode: telegramUserData.language_code || 'en',
          isPremium: telegramUserData.is_premium || false,
          photoUrl: telegramUserData.photo_url || null,
          referralCode,
          lastLoginIP: ipAddress,
          deviceInfo,
          lastActiveTime: new Date(),
        });

        await this.logAuthSuccess('user_created', telegramId, { referralCode });
        console.log('[AuthService] New user created:', telegramId, user.firstName);
      } else {
        // Update existing user's last login info
        user.lastLoginIP = ipAddress;
        user.deviceInfo = deviceInfo;
        user.lastActiveTime = new Date();
        
        // Update user info if changed
        if (telegramUserData.first_name && user.firstName !== telegramUserData.first_name) {
          user.firstName = telegramUserData.first_name;
        }
        if (telegramUserData.username && user.username !== telegramUserData.username) {
          user.username = telegramUserData.username;
        }
        if (telegramUserData.is_premium !== undefined && user.isPremium !== telegramUserData.is_premium) {
          user.isPremium = telegramUserData.is_premium;
        }

        await user.save();
        await this.logAuthSuccess('user_login', telegramId);
        console.log('[AuthService] User logged in:', telegramId, user.firstName);
      }

      return user;
    } catch (error) {
      await this.logAuthError('findOrCreateUser', error.message, telegramId);
      throw error;
    }
  }

  /**
   * Handle referral code during user registration
   */
  async handleReferral(userId, referralCode, ipAddress = null) {
    if (!referralCode) return null;

    try {
      const Referral = require('../models/Referral');
      
      // Find referrer by code
      const referrer = await User.findOne({ referralCode });
      if (!referrer) {
        await this.logAuthError('invalid_referral', `Invalid referral code: ${referralCode}`, userId);
        return null;
      }

      // Check if user already has a referrer
      const existingUser = await User.findById(userId);
      if (existingUser.referredBy) {
        await this.logAuthError('duplicate_referral', 'User already has a referrer', userId);
        return null;
      }

      // Create referral record
      const referral = await Referral.create({
        referralId: uuidv4(),
        referrerId: referrer._id.toString(),
        referrerTelegramId: referrer.telegramId,
        referredId: userId,
        referredTelegramId: existingUser.telegramId,
        referralCode,
        ipAddress,
      });

      // Update referred user
      existingUser.referredBy = referrer.telegramId;
      await existingUser.save();

      // Update referrer stats
      referrer.referralCount += 1;
      await referrer.save();

      await this.logAuthSuccess('referral_created', existingUser.telegramId, {
        referrerTelegramId: referrer.telegramId,
        referralId: referral.referralId
      });

      return referral;
    } catch (error) {
      await this.logAuthError('handleReferral', error.message, userId);
      throw error;
    }
  }

  /**
   * Generate fake user for dev mode
   */
  getDevUser() {
    return {
      id: 'dev-user-1',
      first_name: 'Dev Miner',
      last_name: 'Test',
      username: 'devminer',
      language_code: 'en',
      is_premium: false,
    };
  }

  /**
   * Log authentication success
   */
  async logAuthSuccess(action, telegramId, metadata = {}) {
    try {
      await Log.create({
        logId: uuidv4(),
        level: 'info',
        category: 'auth',
        message: `Auth success: ${action}`,
        telegramId,
        metadata: new Map(Object.entries(metadata)),
      });
    } catch (error) {
      console.error('[AuthService] Failed to log auth success:', error);
    }
  }

  /**
   * Log authentication error
   */
  async logAuthError(action, errorMessage, telegramId) {
    try {
      await Log.create({
        logId: uuidv4(),
        level: 'warn',
        category: 'auth',
        message: `Auth error: ${action} - ${errorMessage}`,
        telegramId,
        error: { message: errorMessage },
      });
    } catch (error) {
      console.error('[AuthService] Failed to log auth error:', error);
    }
  }

  /**
   * Check if user is banned
   */
  async checkBanStatus(telegramId) {
    const user = await User.findOne({ telegramId });
    if (!user) return false;

    if (user.isBanned) {
      // Check if ban has expired
      if (user.banExpiry && new Date(user.banExpiry) < new Date()) {
        user.isBanned = false;
        user.banReason = null;
        user.banExpiry = null;
        await user.save();
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Get ban details
   */
  async getBanDetails(telegramId) {
    const user = await User.findOne({ telegramId });
    if (!user || !user.isBanned) return null;

    return {
      isBanned: user.isBanned,
      reason: user.banReason,
      expiry: user.banExpiry,
      isPermanent: !user.banExpiry,
    };
  }
}

// Export singleton instance
const authService = new AuthService();
authService.init();

module.exports = authService;
