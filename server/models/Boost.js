const mongoose = require('mongoose');

/**
 * Boost Schema
 * Defines available boosts that users can activate
 */
const boostSchema = new mongoose.Schema({
  boostId: { type: String, required: true, unique: true, index: true },
  
  // Boost details
  name: { type: String, required: true },
  description: { type: String, required: true },
  boostType: { 
    type: String, 
    enum: ['tap_multiplier', 'energy_regen', 'auto_mining', 'coin_multiplier', 'xp_multiplier'],
    required: true 
  },
  
  // Boost effects
  multiplier: { type: Number, default: 1 }, // e.g., 2x, 3x
  value: { type: Number, default: 0 }, // Additional value (e.g., +100 energy)
  
  // Duration
  duration: { type: Number, required: true }, // Duration in seconds
  
  // Cost
  costCoins: { type: Number, default: 0 },
  costPremium: { type: Boolean, default: false },
  
  // Availability
  isActive: { type: Boolean, default: true },
  requiredLevel: { type: Number, default: 1 },
  maxUses: { type: Number, default: 1 }, // Max uses per user
  cooldown: { type: Number, default: 0 }, // Cooldown in seconds
  
  // Metadata
  icon: { type: String },
  rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' },
  category: { type: String, default: 'general' },
}, { 
  timestamps: true,
  indexes: [
    { boostId: 1 },
    { isActive: 1, rarity: 1 },
    { boostType: 1 },
    { category: 1 },
  ]
});

module.exports = mongoose.model('Boost', boostSchema);
