const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter, miningLimiter, authLimiter, walletLimiter } = require('../middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');
const { sanitizeInputs } = require('../middleware/validate');

/**
 * API Routes Index
 * Consolidates all route modules with proper middleware
 */

const router = express.Router();

// Apply security middleware
router.use(helmet());
router.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Apply input sanitization
router.use(sanitizeInputs);

// Apply general rate limiting
router.use(apiLimiter);

// Import route modules
const authRoutes = require('./auth');
const gameRoutes = require('./game');
const shopRoutes = require('./shop');
const referralRoutes = require('./referral');
const taskRoutes = require('./tasks');
const friendRoutes = require('./friends');
const leaderboardRoutes = require('./leaderboard');
const walletRoutes = require('./wallet');
const notificationRoutes = require('./notifications');
const userRoutes = require('./users');
const settingsRoutes = require('./settings');
const apiRoutes = require('./api'); // Legacy routes for backward compatibility

// Mount routes with specific rate limiters
router.use('/auth', authLimiter, authRoutes);
router.use('/game', miningLimiter, gameRoutes);
router.use('/shop', shopRoutes);
router.use('/referral', referralRoutes);
router.use('/tasks', taskRoutes);
router.use('/friends', friendRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/wallet', walletLimiter, walletRoutes);
router.use('/notifications', notificationRoutes);
router.use('/users', userRoutes);
router.use('/settings', settingsRoutes);
router.use('/', apiRoutes); // Legacy routes at root for backward compatibility

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'Panda Miner API',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      game: '/api/game/*',
      shop: '/api/shop/*',
      referral: '/api/referral/*',
      tasks: '/api/tasks/*',
      friends: '/api/friends/*',
      leaderboard: '/api/leaderboard/*',
      wallet: '/api/wallet/*',
      notifications: '/api/notifications/*',
      users: '/api/users/*',
      settings: '/api/settings/*',
      legacy: '/api/* (backward compatibility)',
    },
  });
});

// Apply error handlers
router.use(notFoundHandler);
router.use(errorHandler);

module.exports = router;
