const mongoose = require('mongoose');

/**
 * Claim History Schema
 * Tracks all reward claims (daily, tasks, missions, referrals)
 */
const claimHistorySchema = new mongoose.Schema({
  claimId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  telegramId: { type: String, required: true, index: true },
  
  // Claim details
  claimType: { 
    type: String, 
    enum: ['daily_reward', 'task', 'mission', 'referral', 'chest', 'mystery_box', 'level_up', 'achievement'],
    required: true 
  },
  
  // Rewards
  coinsEarned: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  itemsEarned: [{ type: String }], // Skins, badges, etc.
  
  // Related entities
  relatedTaskId: { type: String },
  relatedMissionId: { type: String },
  relatedReferralId: { type: String },
  
  // Timestamps
  claimedAt: { type: Date, default: Date.now, index: true },
  
  // Metadata
  ipAddress: { type: String },
  deviceFingerprint: { type: String },
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String },
}, { 
  timestamps: true,
  indexes: [
    { claimId: 1 },
    { userId: 1, claimedAt: -1 },
    { telegramId: 1, claimedAt: -1 },
    { claimType: 1, claimedAt: -1 },
    { isFlagged: 1 },
  ]
});

module.exports = mongoose.model('ClaimHistory', claimHistorySchema);
