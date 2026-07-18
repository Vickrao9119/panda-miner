const mongoose = require('mongoose');

/**
 * Referral Schema
 * Tracks referral relationships and earnings
 */
const referralSchema = new mongoose.Schema({
  referralId: { type: String, required: true, unique: true, index: true },
  
  // Referral details
  referrerId: { type: String, required: true, index: true }, // User who referred
  referrerTelegramId: { type: String, required: true, index: true },
  referredId: { type: String, required: true, index: true }, // User who was referred
  referredTelegramId: { type: String, required: true, index: true },
  referralCode: { type: String, required: true, index: true },
  
  // Earnings
  referrerEarnings: { type: Number, default: 0 },
  referredBonus: { type: Number, default: 0 },
  
  // Status
  isCompleted: { type: Boolean, default: false }, // Referred user completed required action
  completedAt: { type: Date },
  
  // Fraud detection
  ipAddress: { type: String },
  deviceFingerprint: { type: String },
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
}, { 
  timestamps: true,
  indexes: [
    { referralId: 1 },
    { referrerId: 1, createdAt: -1 },
    { referredId: 1 },
    { referralCode: 1 },
    { isFlagged: 1 },
    { referrerId: 1, isCompleted: 1 },
  ]
});

module.exports = mongoose.model('Referral', referralSchema);
