const mongoose = require('mongoose');

/**
 * Log Schema
 * System logs for debugging, analytics, and security auditing
 */
const logSchema = new mongoose.Schema({
  logId: { type: String, required: true, unique: true, index: true },
  
  // Log details
  level: { type: String, enum: ['debug', 'info', 'warn', 'error', 'fatal'], required: true, index: true },
  category: { type: String, required: true, index: true }, // auth, api, game, wallet, etc.
  message: { type: String, required: true },
  
  // User context
  userId: { type: String, index: true },
  telegramId: { type: String, index: true },
  
  // Request context
  requestId: { type: String, index: true },
  endpoint: { type: String },
  method: { type: String },
  
  // Error details
  error: { type: Object },
  stackTrace: { type: String },
  
  // Metadata
  ipAddress: { type: String },
  userAgent: { type: String },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  
  // Timestamp
  timestamp: { type: Date, default: Date.now, index: true },
}, { 
  timestamps: false, // Logs don't need updatedAt
  indexes: [
    { logId: 1 },
    { level: 1, timestamp: -1 },
    { category: 1, timestamp: -1 },
    { userId: 1, timestamp: -1 },
    { telegramId: 1, timestamp: -1 },
    { requestId: 1 },
    { timestamp: -1 },
  ]
});

// TTL index to auto-delete logs older than 30 days
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Log', logSchema);
