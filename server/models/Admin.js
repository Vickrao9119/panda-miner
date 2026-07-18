const mongoose = require('mongoose');

/**
 * Admin Schema
 * Manages admin accounts and permissions
 */
const adminSchema = new mongoose.Schema({
  adminId: { type: String, required: true, unique: true, index: true },
  telegramId: { type: String, required: true, unique: true, index: true },
  
  // Admin details
  name: { type: String, required: true },
  username: { type: String },
  email: { type: String, required: true, unique: true },
  
  // Permissions
  permissions: [{
    type: String,
    enum: ['user_management', 'task_management', 'wallet_management', 'analytics', 'notifications', 'settings', 'full_access']
  }],
  
  // Authentication
  passwordHash: { type: String, required: true },
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  
  // Status
  isActive: { type: Boolean, default: true, index: true },
  isSuperAdmin: { type: Boolean, default: false },
  
  // Metadata
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { 
  timestamps: true,
  indexes: [
    { adminId: 1 },
    { telegramId: 1 },
    { email: 1 },
    { isActive: 1 },
  ]
});

module.exports = mongoose.model('Admin', adminSchema);
