const mongoose = require('mongoose');

/**
 * Mining History Schema
 * Tracks all mining activities for analytics and fraud detection
 */
const miningHistorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    telegramId: { type: String, required: true, index: true },

    // Mining details
    coinsEarned: { type: Number, required: true },
    xpEarned: { type: Number, required: true },
    energyUsed: { type: Number, required: true },
    tapPower: { type: Number, required: true },
    tapMultiplier: { type: Number, default: 1 },

    // Session info
    sessionId: { type: String, index: true },
    sessionStartTime: { type: Date },

    // Location & device
    ipAddress: { type: String },
    userAgent: { type: String },

    // Timestamp
    timestamp: { type: Date, default: Date.now },

    // Metadata
    isOffline: { type: Boolean, default: false },
    isAutoTap: { type: Boolean, default: false },
    boostActive: { type: String, default: null },
  },
  {
    timestamps: true,
    indexes: [
      { userId: 1, timestamp: -1 },
      { telegramId: 1, timestamp: -1 },
      { timestamp: -1 },
      { sessionId: 1 },
    ],
  },
);

// Index for daily aggregation
miningHistorySchema.index({ userId: 1, timestamp: 1 });

module.exports = mongoose.model('MiningHistory', miningHistorySchema);
