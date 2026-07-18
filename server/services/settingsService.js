const Settings = require('../models/Settings');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

/**
 * Settings Service
 * Handles user settings and preferences
 */
class SettingsService {
  /**
   * Get user settings
   */
  async getSettings(telegramId) {
    try {
      let settings = await Settings.findOne({ telegramId });
      
      // Create default settings if not exist
      if (!settings) {
        settings = await Settings.create({
          userId: telegramId,
          telegramId,
        });
      }

      return {
        success: true,
        settings: {
          soundEnabled: settings.soundEnabled,
          musicEnabled: settings.musicEnabled,
          soundVolume: settings.soundVolume,
          musicVolume: settings.musicVolume,
          vibrationEnabled: settings.vibrationEnabled,
          hapticIntensity: settings.hapticIntensity,
          language: settings.language,
          theme: settings.theme,
          fontSize: settings.fontSize,
          notificationsEnabled: settings.notificationsEnabled,
          pushNotifications: settings.pushNotifications,
          emailNotifications: settings.emailNotifications,
          showOnlineStatus: settings.showOnlineStatus,
          showMiningStats: settings.showMiningStats,
          allowFriendRequests: settings.allowFriendRequests,
          autoClaimRewards: settings.autoClaimRewards,
          showTutorial: settings.showTutorial,
          enableAnimations: settings.enableAnimations,
          dataUsage: settings.dataUsage,
          cacheEnabled: settings.cacheEnabled,
        },
      };

    } catch (error) {
      console.error('[SettingsService] Get settings error:', error);
      throw error;
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(telegramId, updates) {
    try {
      let settings = await Settings.findOne({ telegramId });
      
      if (!settings) {
        settings = await Settings.create({
          userId: telegramId,
          telegramId,
        });
      }

      // Update allowed fields
      const allowedFields = [
        'soundEnabled', 'musicEnabled', 'soundVolume', 'musicVolume',
        'vibrationEnabled', 'hapticIntensity', 'language', 'theme',
        'fontSize', 'notificationsEnabled', 'pushNotifications',
        'emailNotifications', 'showOnlineStatus', 'showMiningStats',
        'allowFriendRequests', 'autoClaimRewards', 'showTutorial',
        'enableAnimations', 'dataUsage', 'cacheEnabled',
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          settings[field] = updates[field];
        }
      }

      await settings.save();

      return {
        success: true,
        settings: await this.getSettings(telegramId),
      };

    } catch (error) {
      console.error('[SettingsService] Update settings error:', error);
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(telegramId) {
    try {
      await Settings.deleteOne({ telegramId });
      
      // Create new default settings
      const settings = await Settings.create({
        userId: telegramId,
        telegramId,
      });

      return {
        success: true,
        settings: await this.getSettings(telegramId),
      };

    } catch (error) {
      console.error('[SettingsService] Reset settings error:', error);
      throw error;
    }
  }

  /**
   * Get available languages
   */
  async getAvailableLanguages() {
    try {
      const languages = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'it', name: 'Italiano', flag: '🇮🇹' },
        { code: 'pt', name: 'Português', flag: '🇵🇹' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' },
        { code: 'zh', name: '中文', flag: '🇨🇳' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' },
        { code: 'ko', name: '한국어', flag: '🇰🇷' },
        { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
        { code: 'ar', name: 'العربية', flag: '🇸🇦' },
      ];

      return {
        success: true,
        languages,
      };

    } catch (error) {
      console.error('[SettingsService] Get available languages error:', error);
      throw error;
    }
  }

  /**
   * Get available themes
   */
  async getAvailableThemes() {
    try {
      const themes = [
        { id: 'light', name: 'Light', icon: '☀️' },
        { id: 'dark', name: 'Dark', icon: '🌙' },
        { id: 'auto', name: 'Auto', icon: '🔄' },
      ];

      return {
        success: true,
        themes,
      };

    } catch (error) {
      console.error('[SettingsService] Get available themes error:', error);
      throw error;
    }
  }

  /**
   * Export settings
   */
  async exportSettings(telegramId) {
    try {
      const settings = await Settings.findOne({ telegramId });
      
      if (!settings) {
        throw new Error('Settings not found');
      }

      return {
        success: true,
        export: {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          settings: settings.toObject(),
        },
      };

    } catch (error) {
      console.error('[SettingsService] Export settings error:', error);
      throw error;
    }
  }

  /**
   * Import settings
   */
  async importSettings(telegramId, settingsData) {
    try {
      let settings = await Settings.findOne({ telegramId });
      
      if (!settings) {
        settings = await Settings.create({
          userId: telegramId,
          telegramId,
        });
      }

      // Import settings data
      const allowedFields = [
        'soundEnabled', 'musicEnabled', 'soundVolume', 'musicVolume',
        'vibrationEnabled', 'hapticIntensity', 'language', 'theme',
        'fontSize', 'notificationsEnabled', 'pushNotifications',
        'emailNotifications', 'showOnlineStatus', 'showMiningStats',
        'allowFriendRequests', 'autoClaimRewards', 'showTutorial',
        'enableAnimations', 'dataUsage', 'cacheEnabled',
      ];

      for (const field of allowedFields) {
        if (settingsData[field] !== undefined) {
          settings[field] = settingsData[field];
        }
      }

      await settings.save();

      return {
        success: true,
        settings: await this.getSettings(telegramId),
      };

    } catch (error) {
      console.error('[SettingsService] Import settings error:', error);
      throw error;
    }
  }
}

module.exports = new SettingsService();
