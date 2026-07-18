const mongoose = require('mongoose');

/**
 * Settings Schema
 * Stores user-specific app settings and preferences
 */
const settingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  telegramId: { type: String, required: true, index: true },
  
  // Audio settings
  soundEnabled: { type: Boolean, default: true },
  musicEnabled: { type: Boolean, default: true },
  soundVolume: { type: Number, default: 0.5, min: 0, max: 1 },
  musicVolume: { type: Number, default: 0.3, min: 0, max: 1 },
  
  // Haptic settings
  vibrationEnabled: { type: Boolean, default: true },
  hapticIntensity: { type: String, enum: ['light', 'medium', 'heavy'], default: 'medium' },
  
  // Display settings
  language: { type: String, default: 'en' },
  theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'dark' },
  fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
  
  // Notification settings
  notificationsEnabled: { type: Boolean, default: true },
  pushNotifications: { type: Boolean, default: true },
  emailNotifications: { type: Boolean, default: false },
  
  // Privacy settings
  showOnlineStatus: { type: Boolean, default: true },
  showMiningStats: { type: Boolean, default: true },
  allowFriendRequests: { type: Boolean, default: true },
  
  // Gameplay settings
  autoClaimRewards: { type: Boolean, default: false },
  showTutorial: { type: Boolean, default: true },
  enableAnimations: { type: Boolean, default: true },
  
  // Advanced settings
  dataUsage: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  cacheEnabled: { type: Boolean, default: true },
}, { 
  timestamps: true,
  indexes: [
    { userId: 1 },
    { telegramId: 1 },
  ]
});

module.exports = mongoose.model('Settings', settingsSchema);
