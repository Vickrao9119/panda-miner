const mongoose = require('mongoose');

/**
 * Friend Schema
 * Manages user friendships and social connections
 */
const friendSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  friendId: { type: String, required: true, index: true },
  
  // Friend details
  friendTelegramId: { type: String, required: true, index: true },
  friendName: { type: String, required: true },
  friendUsername: { type: String },
  friendAvatar: { type: String },
  
  // Relationship status
  status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending', index: true },
  
  // Mining bonus
  miningBonus: { type: Number, default: 0 }, // Bonus coins from friend mining
  
  // Timestamps
  requestedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  
  // Metadata
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date },
}, { 
  timestamps: true,
  indexes: [
    { userId: 1, status: 1 },
    { friendId: 1, status: 1 },
    { friendTelegramId: 1 },
    { userId: 1, friendId: 1 }, // Unique friendship
  ]
});

// Ensure unique friendship (both directions)
friendSchema.index({ userId: 1, friendId: 1 }, { unique: true });

module.exports = mongoose.model('Friend', friendSchema);
