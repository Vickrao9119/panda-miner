const mongoose = require('mongoose');

/**
 * Mission Schema
 * Time-limited missions with progressive rewards
 */
const missionSchema = new mongoose.Schema({
  missionId: { type: String, required: true, unique: true, index: true },
  
  // Mission details
  title: { type: String, required: true },
  description: { type: String, required: true },
  missionType: { 
    type: String, 
    enum: ['mining', 'referral', 'social', 'shop', 'level', 'combo'],
    required: true 
  },
  
  // Mission requirements
  targetValue: { type: Number, required: true }, // Target to achieve
  currentValue: { type: Number, default: 0 }, // Progress tracking
  
  // Rewards
  rewardCoins: { type: Number, default: 0 },
  rewardXP: { type: Number, default: 0 },
  rewardItems: [{ type: String }], // Skins, badges, etc.
  
  // Time limits
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  
  // Mission status
  isActive: { type: Boolean, default: true },
  isCompleted: { type: Boolean, default: false },
  isClaimed: { type: Boolean, default: false },
  
  // User assignment
  userId: { type: String, required: true, index: true },
  telegramId: { type: String, required: true, index: true },
  
  // Metadata
  priority: { type: Number, default: 0 },
  category: { type: String, default: 'daily' }, // daily, weekly, special
  icon: { type: String },
}, { 
  timestamps: true,
  indexes: [
    { missionId: 1 },
    { userId: 1, isActive: 1 },
    { telegramId: 1, isActive: 1 },
    { startTime: 1, endTime: 1 },
    { category: 1, isActive: 1 },
  ]
});

module.exports = mongoose.model('Mission', missionSchema);
