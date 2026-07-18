const mongoose = require('mongoose');

/**
 * Wallet Schema
 * Manages user wallet connections and transactions
 */
const walletSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  telegramId: { type: String, required: true, index: true },
  
  // Wallet details
  walletAddress: { type: String, required: true, unique: true, sparse: true },
  walletType: { type: String, enum: ['ton', 'eth', 'btc'], default: 'ton' },
  
  // Balance
  balance: { type: Number, default: 0 },
  lockedBalance: { type: Number, default: 0 }, // For pending transactions
  
  // Connection status
  isConnected: { type: Boolean, default: false },
  connectedAt: { type: Date },
  lastVerified: { type: Date },
  
  // Withdrawal limits
  dailyWithdrawalLimit: { type: Number, default: 1000 },
  dailyWithdrawn: { type: Number, default: 0 },
  lastWithdrawalReset: { type: Date, default: Date.now },
  
  // Metadata
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
}, { 
  timestamps: true,
  indexes: [
    { userId: 1 },
    { telegramId: 1 },
    { walletAddress: 1 },
    { isConnected: 1 },
  ]
});

module.exports = mongoose.model('Wallet', walletSchema);
