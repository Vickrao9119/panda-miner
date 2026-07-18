const mongoose = require('mongoose');
const { MAX_ENERGY_BASE, COINS_PER_TAP_BASE } = require('../config/gameConfig');

/**
 * Enhanced User Schema for Production Telegram Mini App
 * Includes all features: mining, referrals, tasks, boosts, wallet, etc.
 */
const userSchema = new mongoose.Schema({
  // Telegram User Information
  telegramId: { type: String, required: true, unique: true, index: true },
  firstName: { type: String, default: 'Miner' },
  lastName: { type: String, default: null },
  username: { type: String, default: null, index: true },
  languageCode: { type: String, default: 'en' },
  isPremium: { type: Boolean, default: false },
  photoUrl: { type: String, default: null },

  // Game Currency
  coins: { type: Number, default: 0, index: true },
  totalMined: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1, index: true },

  // Energy System
  energy: { type: Number, default: MAX_ENERGY_BASE },
  maxEnergy: { type: Number, default: MAX_ENERGY_BASE },
  lastEnergyUpdate: { type: Date, default: Date.now },

  // Mining Power
  tapPower: { type: Number, default: COINS_PER_TAP_BASE },
  tapMultiplier: { type: Number, default: 1 },
  autoTapEnabled: { type: Boolean, default: false },
  autoTapPower: { type: Number, default: 0 },

  // Energy Regeneration
  regenTier: { type: Number, default: 0 },
  energyRegenRate: { type: Number, default: 1 }, // Energy per tick

  // Offline Mining
  offlineMiningEnabled: { type: Boolean, default: false },
  offlineMiningRate: { type: Number, default: 0 }, // Coins per hour
  lastActiveTime: { type: Date, default: Date.now },
  offlineEarningsClaimed: { type: Number, default: 0 },

  // Chest & Mystery Box
  chestReady: { type: Boolean, default: false },
  chestClaimedForLevel: { type: Number, default: 0 },
  lastBoxClaim: { type: Number, default: 0 },

  // Shop & Upgrades
  shopLevels: { type: Map, of: Number, default: {} },
  purchasedSkins: { type: [String], default: [] },
  activeSkin: { type: String, default: null },
  purchasedAnimations: { type: [String], default: [] },

  // Badges & Achievements
  badges: { type: [String], default: [] },
  achievements: { type: Map, of: Object, default: {} },

  // Referral System
  referralCode: { type: String, unique: true, sparse: true, index: true },
  referredBy: { type: String, index: true }, // Referrer's telegramId
  referralCount: { type: Number, default: 0 },
  totalReferralEarnings: { type: Number, default: 0 },
  referralEarningsClaimed: { type: Number, default: 0 },

  // Daily Rewards
  dailyRewardStreak: { type: Number, default: 0 },
  lastDailyRewardClaim: { type: Date, default: null },
  dailyRewardAvailable: { type: Boolean, default: true },

  // Tasks & Missions
  completedTasks: { type: [String], default: [] },
  completedMissions: { type: [String], default: [] },
  activeBoosts: { type: Map, of: Object, default: {} }, // { boostId: { endTime, value } }

  // Statistics
  totalTaps: { type: Number, default: 0 },
  totalPlayTime: { type: Number, default: 0 }, // In seconds
  highestLevel: { type: Number, default: 1 },
  maxCoins: { type: Number, default: 0 },

  // Wallet
  walletAddress: { type: String, default: null },
  walletConnected: { type: Boolean, default: false },
  totalWithdrawn: { type: Number, default: 0 },
  totalDeposited: { type: Number, default: 0 },

  // Settings
  settings: {
    soundEnabled: { type: Boolean, default: true },
    musicEnabled: { type: Boolean, default: true },
    vibrationEnabled: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    theme: { type: String, default: 'dark' },
    notificationsEnabled: { type: Boolean, default: true },
  },

  // Account Status
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: null },
  banExpiry: { type: Date, default: null },
  isAdmin: { type: Boolean, default: false },

  // Metadata
  lastLoginIP: { type: String, default: null },
  deviceInfo: { type: Object, default: null },
  version: { type: String, default: '1.0.0' },
}, { 
  timestamps: true, 
  bufferCommands: false,
  indexes: [
    { telegramId: 1 },
    { username: 1 },
    { referralCode: 1 },
    { referredBy: 1 },
    { level: -1, totalMined: -1 }, // Leaderboard index
    { coins: -1 },
  ]
});

// Virtual for coins per hour calculation
userSchema.virtual('coinsPerHour').get(function() {
  const baseRate = this.tapPower * 3600; // Assuming 1 tap per second
  const offlineRate = this.offlineMiningRate;
  const autoTapRate = this.autoTapEnabled ? this.autoTapPower * 3600 : 0;
  return baseRate + offlineRate + autoTapRate;
});

// Method to check if user can claim daily reward
userSchema.methods.canClaimDailyReward = function() {
  if (!this.lastDailyRewardClaim) return true;
  const lastClaim = new Date(this.lastDailyRewardClaim);
  const now = new Date();
  const hoursDiff = (now - lastClaim) / (1000 * 60 * 60);
  return hoursDiff >= 24;
};

// Method to check if user has active boost
userSchema.methods.hasActiveBoost = function(boostId) {
  const boost = this.activeBoosts.get(boostId);
  if (!boost) return false;
  return new Date(boost.endTime) > new Date();
};

// Method to apply energy regeneration
userSchema.methods.applyEnergyRegen = function() {
  if (this.energy >= this.maxEnergy) {
    this.lastEnergyUpdate = new Date();
    return 0;
  }
  const elapsedMs = Date.now() - new Date(this.lastEnergyUpdate).getTime();
  const regenRate = this.energyRegenRate * (1 + this.regenTier);
  const ticks = Math.floor(elapsedMs / 1500); // ENERGY_REGEN_MS
  if (ticks > 0) {
    const regen = ticks * regenRate;
    this.energy = Math.min(this.maxEnergy, this.energy + regen);
    this.lastEnergyUpdate = new Date(new Date(this.lastEnergyUpdate).getTime() + ticks * 1500);
    return regen;
  }
  return 0;
};

// Method to calculate offline earnings
userSchema.methods.calculateOfflineEarnings = function() {
  if (!this.offlineMiningEnabled || !this.lastActiveTime) return 0;
  const elapsedHours = (Date.now() - new Date(this.lastActiveTime).getTime()) / (1000 * 60 * 60);
  const maxOfflineHours = 8; // Max 8 hours of offline mining
  const effectiveHours = Math.min(elapsedHours, maxOfflineHours);
  return Math.floor(effectiveHours * this.offlineMiningRate);
};

// Static method to generate referral code
userSchema.statics.generateReferralCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = mongoose.model('User', userSchema);
