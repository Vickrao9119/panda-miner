const settingsService = require('../services/settingsService');

/**
 * Settings Controller
 * Handles settings-related endpoints
 */
class SettingsController {
  /**
   * GET /api/settings
   * Get user settings
   */
  async getSettings(req, res) {
    try {
      const user = req.user;
      const result = await settingsService.getSettings(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[SettingsController] Get settings error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get settings'
      });
    }
  }

  /**
   * PUT /api/settings
   * Update user settings
   */
  async updateSettings(req, res) {
    try {
      const user = req.user;
      const updates = req.body;

      const result = await settingsService.updateSettings(user.telegramId, updates);
      return res.json(result);

    } catch (error) {
      console.error('[SettingsController] Update settings error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to update settings'
      });
    }
  }

  /**
   * POST /api/settings/reset
   * Reset settings to defaults
   */
  async resetSettings(req, res) {
    try {
      const user = req.user;
      const result = await settingsService.resetSettings(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[SettingsController] Reset settings error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reset settings'
      });
    }
  }

  /**
   * GET /api/settings/languages
   * Get available languages
   */
  async getLanguages(req, res) {
    try {
      const result = await settingsService.getAvailableLanguages();
      return res.json(result);

    } catch (error) {
      console.error('[SettingsController] Get languages error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get languages'
      });
    }
  }

  /**
   * GET /api/settings/themes
   * Get available themes
   */
  async getThemes(req, res) {
    try {
      const result = await settingsService.getAvailableThemes();
      return res.json(result);

    } catch (error) {
      console.error('[SettingsController] Get themes error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get themes'
      });
    }
  }

  /**
   * GET /api/settings/export
   * Export settings
   */
  async exportSettings(req, res) {
    try {
      const user = req.user;
      const result = await settingsService.exportSettings(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[SettingsController] Export settings error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to export settings'
      });
    }
  }

  /**
   * POST /api/settings/import
   * Import settings
   */
  async importSettings(req, res) {
    try {
      const user = req.user;
      const { settingsData } = req.body;

      if (!settingsData) {
        return res.status(400).json({
          success: false,
          error: 'Settings data is required'
        });
      }

      const result = await settingsService.importSettings(user.telegramId, settingsData);
      return res.json(result);

    } catch (error) {
      console.error('[SettingsController] Import settings error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to import settings'
      });
    }
  }
}

module.exports = new SettingsController();
