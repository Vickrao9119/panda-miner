const mongoose = require('mongoose');

/**
 * Daily Reward Schema
 * Tracks daily login rewards and streaks
 */
const dailyRewardSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  telegramId: { type: String, required: true, index: true },
  
  // Streak tracking
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  
  // Reward details
  dayNumber: { type: Number, required: true }, // Day 1, 2, 3, etc.
  rewardAmount: { type: Number, required: true },
  rewardType: { type: String, enum: ['coins', 'xp', 'boost', 'skin'], default: 'coins' },
  bonusMultiplier: { type: Number, default: 1 },
  
  // Timestamps
  claimedAt: { type: Date, default: Date.now, index: true },
  nextClaimTime: { type: Date, required: true },
  
  // Metadata
  isBonusDay: { type: Boolean, default: false }, // Every 7th day is bonus
  bonusReward: { type: Number, default: 0 },
}, { 
  timestamps: true,
  indexes: [
    { userId: 1, claimedAt: -1 },
    { telegramId: 1, claimedAt: -1 },
    { claimedAt: -1 },
  ]
});

module.exports = mongoose.model('DailyReward', dailyRewardSchema);
