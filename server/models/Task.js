const mongoose = require('mongoose');

/**
 * Task Schema
 * Defines available tasks for users to complete
 */
const taskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true, index: true },
  
  // Task details
  title: { type: String, required: true },
  description: { type: String, required: true },
  taskType: { 
    type: String, 
    enum: ['telegram_join', 'twitter_follow', 'youtube_subscribe', 'website_visit', 'invite_friends', 'daily_mining', 'level_up'],
    required: true 
  },
  
  // Task requirements
  targetUrl: { type: String }, // URL to visit/join
  targetChannel: { type: String }, // Telegram channel username
  targetCount: { type: Number, default: 1 }, // Required count (e.g., invite 5 friends)
  
  // Rewards
  rewardCoins: { type: Number, default: 0 },
  rewardXP: { type: Number, default: 0 },
  rewardBoost: { type: String }, // Boost ID if reward is a boost
  
  // Task availability
  isActive: { type: Boolean, default: true },
  isDaily: { type: Boolean, default: false },
  isOneTime: { type: Boolean, default: true },
  requiredLevel: { type: Number, default: 1 },
  
  // Time limits
  startDate: { type: Date },
  endDate: { type: Date },
  
  // Priority & ordering
  priority: { type: Number, default: 0 },
  category: { type: String, default: 'general' }, // social, mining, referral
  
  // Metadata
  icon: { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
}, { 
  timestamps: true,
  indexes: [
    { taskId: 1 },
    { isActive: 1, priority: -1 },
    { taskType: 1 },
    { category: 1 },
  ]
});

module.exports = mongoose.model('Task', taskSchema);
