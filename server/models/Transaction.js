const mongoose = require('mongoose');

/**
 * Transaction Schema
 * Tracks all wallet transactions (deposits, withdrawals, transfers)
 */
const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  telegramId: { type: String, required: true, index: true },
  
  // Transaction details
  type: { type: String, enum: ['deposit', 'withdrawal', 'transfer', 'reward', 'penalty'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'TON' },
  
  // Status
  status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending', index: true },
  
  // Wallet details
  fromAddress: { type: String },
  toAddress: { type: String },
  txHash: { type: String, index: true }, // Blockchain transaction hash
  
  // Fees
  fee: { type: Number, default: 0 },
  networkFee: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
  completedAt: { type: Date },
  
  // Metadata
  description: { type: String },
  category: { type: String, default: 'general' }, // mining, referral, task, etc.
  relatedTaskId: { type: String },
  relatedMissionId: { type: String },
}, { 
  timestamps: true,
  indexes: [
    { transactionId: 1 },
    { userId: 1, createdAt: -1 },
    { telegramId: 1, createdAt: -1 },
    { status: 1, createdAt: -1 },
    { txHash: 1 },
  ]
});

module.exports = mongoose.model('Transaction', transactionSchema);
