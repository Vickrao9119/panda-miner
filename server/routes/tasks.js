const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

/**
 * Task Routes
 * Handles task and mission endpoints
 */

/**
 * Middleware to verify Telegram initData
 */
const verifyTelegram = (req, res, next) => {
  try {
    const { initData } = req.body;

    // Dev mode: allow fake user
    if (!initData && authService.isDevMode()) {
      req.telegramUser = authService.getDevUser();
      return next();
    }

    // Verify initData
    const verification = authService.verifyInitData(initData);
    req.telegramUser = verification.user;
    next();

  } catch (error) {
    console.error('[Task Routes] Telegram verification failed:', error);
    return res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
};

/**
 * Middleware to attach user to request
 */
const attachUser = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const telegramId = String(req.telegramUser.id);
    
    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error('[Task Routes] Attach user failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to attach user'
    });
  }
};

// GET /api/tasks - Get available tasks
router.get('/', verifyTelegram, attachUser, asyncHandler(taskController.getTasks.bind(taskController)));

// POST /api/tasks/:taskId/complete - Complete a task
router.post('/:taskId/complete', verifyTelegram, attachUser, asyncHandler(taskController.completeTask.bind(taskController)));

// GET /api/tasks/categories - Get task categories
router.get('/categories', asyncHandler(taskController.getCategories.bind(taskController)));

// GET /api/missions - Get available missions
router.get('/missions', verifyTelegram, attachUser, asyncHandler(taskController.getMissions.bind(taskController)));

// POST /api/missions - Create a mission (admin)
router.post('/missions', verifyTelegram, attachUser, asyncHandler(taskController.createMission.bind(taskController)));

// POST /api/missions/:missionId/progress - Update mission progress
router.post('/missions/:missionId/progress', asyncHandler(taskController.updateProgress.bind(taskController)));

// POST /api/missions/:missionId/claim - Claim mission reward
router.post('/missions/:missionId/claim', verifyTelegram, attachUser, asyncHandler(taskController.claimReward.bind(taskController)));

// POST /api/tasks/reset-daily - Reset daily tasks
router.post('/reset-daily', asyncHandler(taskController.resetDaily.bind(taskController)));

module.exports = router;
