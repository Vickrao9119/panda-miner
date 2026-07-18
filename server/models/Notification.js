const mongoose = require('mongoose');

/**
 * Notification Schema
 * Manages user notifications and alerts
 */
const notificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  telegramId: { type: String, required: true, index: true },
  
  // Notification details
  type: { 
    type: String, 
    enum: ['daily_reward', 'energy_full', 'mission_complete', 'referral_joined', 'coins_claimed', 'announcement', 'level_up', 'achievement_unlocked'],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  // Notification content
  data: { type: Map, of: mongoose.Schema.Types.Mixed }, // Additional data like reward amount, etc.
  
  // Status
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
  
  // Delivery
  isPushed: { type: Boolean, default: false },
  pushedAt: { type: Date },
  pushId: { type: String },
  
  // Priority
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date },
}, { 
  timestamps: true,
  indexes: [
    { notificationId: 1 },
    { userId: 1, isRead: 1, createdAt: -1 },
    { telegramId: 1, isRead: 1, createdAt: -1 },
    { type: 1, createdAt: -1 },
    { priority: 1, createdAt: -1 },
  ]
});

module.exports = mongoose.model('Notification', notificationSchema);
