const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const verifyTelegram = require('../middleware/verifyTelegram');
const {
  XP_PER_TAP,
  ENERGY_PER_TAP,
  ENERGY_REGEN_MS,
  MYSTERY_BOX_COOLDOWN_MS,
  SHOP_ITEMS,
  xpForLevel,
  shopItemCost,
} = require('../config/gameConfig');

/* ---------- helpers ---------- */

/**
 * Async handler wrapper to catch errors and pass to Express error middleware.
 * This eliminates the need for try-catch in every route handler.
 */
function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

/**
 * Middleware to ensure MongoDB is connected before processing requests.
 * Returns 503 Service Unavailable if database is not ready.
 */
function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    console.error('[api] Database unavailable, connection state:', mongoose.connection.readyState);
    return res.status(503).json({
      error: 'Database unavailable',
      message: 'MongoDB is not connected. Check MONGO_URI, DNS, and MongoDB Atlas network access.',
    });
  }

  return next();
}

/**
 * Find existing user by Telegram ID or create a new one.
 * This ensures every Telegram user has a persistent game state.
 */
async function findOrCreateUser(tgUser) {
  const telegramId = String(tgUser.id);
  let user = await User.findOne({ telegramId });

  if (!user) {
    console.log('[api] Creating new user:', telegramId, tgUser.first_name);
    user = await User.create({
      telegramId,
      firstName: tgUser.first_name || 'Miner',
      username: tgUser.username || null,
    });
  }

  return user;
}

/**
 * Applies energy regeneration based on elapsed time since lastEnergyUpdate.
 * Energy regenerates at a rate of (1 + regenTier) energy per ENERGY_REGEN_MS.
 * This mutates the user object but does not save to database.
 */
function applyEnergyRegen(user) {
  if (user.energy >= user.maxEnergy) {
    user.lastEnergyUpdate = new Date();
    return;
  }

  const elapsedMs = Date.now() - new Date(user.lastEnergyUpdate).getTime();
  const ticks = Math.floor(elapsedMs / ENERGY_REGEN_MS);

  if (ticks > 0) {
    const regen = ticks * (1 + user.regenTier);
    user.energy = Math.min(user.maxEnergy, user.energy + regen);
    user.lastEnergyUpdate = new Date(new Date(user.lastEnergyUpdate).getTime() + ticks * ENERGY_REGEN_MS);
  }
}

/**
 * Returns a public-safe version of user state for sending to the client.
 * Excludes sensitive data like internal IDs.
 */
function publicState(user) {
  return {
    playerName: user.firstName,
    coins: user.coins,
    totalMined: user.totalMined,
    xp: user.xp,
    level: user.level,
    xpNeeded: xpForLevel(user.level),
    energy: user.energy,
    maxEnergy: user.maxEnergy,
    tapPower: user.tapPower,
    regenTier: user.regenTier,
    chestReady: user.chestReady,
    lastBoxClaim: user.lastBoxClaim,
    boxCooldownMs: MYSTERY_BOX_COOLDOWN_MS,
    shopLevels: Object.fromEntries(user.shopLevels || []),
    badges: user.badges,
  };
}

/**
 * Checks if user has enough XP to level up.
 * Handles multiple level-ups at once and unlocks chest rewards at level milestones.
 * Returns true if user leveled up.
 */
function checkLevelUp(user) {
  let leveled = false;

  while (user.xp >= xpForLevel(user.level)) {
    user.xp -= xpForLevel(user.level);
    user.level += 1;
    leveled = true;
    console.log('[api] User leveled up to:', user.level);
  }

  // Unlock chest reward at every 5th level (5, 10, 15, ...)
  if (leveled && user.level > user.chestClaimedForLevel && user.level % 5 === 0) {
    user.chestReady = true;
    console.log('[api] Chest unlocked at level:', user.level);
  }

  return leveled;
}

/* ---------- routes ---------- */

// Apply database check middleware to all routes
router.use(requireDatabase);

/**
 * POST /api/state
 * Fetch current user state including energy regeneration.
 * This is called periodically to keep the UI in sync with server state.
 */
router.post('/state', verifyTelegram, asyncHandler(async (req, res) => {
  console.log('[api] /state request for user:', req.telegramUser.id);
  const user = await findOrCreateUser(req.telegramUser);
  applyEnergyRegen(user);
  await user.save();
  res.json(publicState(user));
}));

/**
 * POST /api/mine
 * Process a single tap/mining action.
 * Consumes energy, adds coins and XP, checks for level-ups.
 */
router.post('/mine', verifyTelegram, asyncHandler(async (req, res) => {
  console.log('[api] /mine request for user:', req.telegramUser.id);
  const user = await findOrCreateUser(req.telegramUser);
  applyEnergyRegen(user);

  if (user.energy < ENERGY_PER_TAP) {
    console.log('[api] Not enough energy:', user.energy, 'required:', ENERGY_PER_TAP);
    await user.save();
    return res.status(400).json({ error: 'Not enough energy', state: publicState(user) });
  }

  // Apply mining rewards
  user.energy -= ENERGY_PER_TAP;
  user.coins += user.tapPower;
  user.totalMined += user.tapPower;
  user.xp += XP_PER_TAP;
  const leveledUp = checkLevelUp(user);

  console.log('[api] Mining successful:', {
    gained: user.tapPower,
    newCoins: user.coins,
    energy: user.energy,
    leveledUp
  });

  await user.save();
  res.json({ gained: user.tapPower, leveledUp, state: publicState(user) });
}));

/**
 * GET /api/shop
 * Returns shop items with current levels and costs for the requesting user.
 * Does not require authentication (public endpoint for pricing).
 */
router.get('/shop', asyncHandler(async (req, res) => {
  const telegramId = req.query.telegramId;
  let levels = {};

  if (telegramId) {
    const user = await User.findOne({ telegramId: String(telegramId) });
    if (user) levels = Object.fromEntries(user.shopLevels || []);
  }

  const items = SHOP_ITEMS.map((item) => {
    const lvl = levels[item.id] || 0;
    return {
      id: item.id,
      name: item.name,
      maxLevel: item.maxLevel,
      level: lvl,
      maxed: lvl >= item.maxLevel,
      cost: lvl >= item.maxLevel ? 0 : shopItemCost(item, lvl),
    };
  });

  res.json({ items });
}));

/**
 * POST /api/shop/buy
 * Purchase a shop item. Requires authentication.
 * Deducts coins, applies item effects, and returns updated state.
 */
router.post('/shop/buy', verifyTelegram, asyncHandler(async (req, res) => {
  console.log('[api] /shop/buy request for user:', req.telegramUser.id, 'item:', req.body.itemId);
  const { itemId } = req.body;
  const item = SHOP_ITEMS.find((i) => i.id === itemId);

  if (!item) {
    console.log('[api] Unknown item:', itemId);
    return res.status(400).json({ error: 'Unknown item' });
  }

  const user = await findOrCreateUser(req.telegramUser);
  applyEnergyRegen(user);

  const currentLevel = (user.shopLevels && user.shopLevels.get(item.id)) || 0;

  if (currentLevel >= item.maxLevel) {
    console.log('[api] Item already maxed:', itemId);
    return res.status(400).json({ error: 'Item already maxed' });
  }

  const cost = shopItemCost(item, currentLevel);

  if (user.coins < cost) {
    console.log('[api] Not enough coins:', user.coins, 'required:', cost);
    return res.status(400).json({ error: 'Not enough coins' });
  }

  // Deduct cost and apply upgrade
  user.coins -= cost;
  user.shopLevels.set(item.id, currentLevel + 1);

  // Apply item effects
  if (item.effect === 'tapPower') user.tapPower += 1;
  if (item.effect === 'maxEnergy') {
    user.maxEnergy += 500;
    user.energy += 500; // Refill energy on upgrade
  }
  if (item.effect === 'regenSpeed') user.regenTier += 1;
  if (item.effect === 'badge' && !user.badges.includes(item.id)) user.badges.push(item.id);

  console.log('[api] Purchase successful:', {
    itemId,
    newLevel: currentLevel + 1,
    newCoins: user.coins
  });

  await user.save();
  res.json({ purchased: item.id, state: publicState(user) });
}));

/**
 * POST /api/chest/open
 * Open the level-up chest reward.
 * Chest becomes available every 5 levels (5, 10, 15, ...).
 */
router.post('/chest/open', verifyTelegram, asyncHandler(async (req, res) => {
  console.log('[api] /chest/open request for user:', req.telegramUser.id);
  const user = await findOrCreateUser(req.telegramUser);

  if (!user.chestReady) {
    console.log('[api] Chest not ready for user:', req.telegramUser.id);
    return res.status(400).json({ error: 'Chest not ready' });
  }

  const reward = 500 + user.level * 100;
  user.coins += reward;
  user.totalMined += reward;
  user.chestReady = false;
  user.chestClaimedForLevel = user.level;

  console.log('[api] Chest opened:', {
    reward,
    level: user.level,
    newCoins: user.coins
  });

  await user.save();
  res.json({ reward, state: publicState(user) });
}));

/**
 * POST /api/box/open
 * Open the mystery box for a random coin reward.
 * Has a cooldown period between uses.
 */
router.post('/box/open', verifyTelegram, asyncHandler(async (req, res) => {
  console.log('[api] /box/open request for user:', req.telegramUser.id);
  const user = await findOrCreateUser(req.telegramUser);
  const remaining = MYSTERY_BOX_COOLDOWN_MS - (Date.now() - user.lastBoxClaim);

  if (remaining > 0) {
    console.log('[api] Box on cooldown for user:', req.telegramUser.id, 'remaining:', remaining);
    return res.status(400).json({ error: 'Box on cooldown', remainingMs: remaining });
  }

  // Random reward calculation
  const roll = Math.random();
  let reward;
  if (roll < 0.05) reward = 5000; // 5% chance for jackpot
  else if (roll < 0.3) reward = 1000; // 25% chance for big reward
  else reward = 200 + Math.floor(Math.random() * 300); // 70% chance for small reward

  user.coins += reward;
  user.totalMined += reward;
  user.lastBoxClaim = Date.now();

  console.log('[api] Mystery box opened:', {
    reward,
    roll,
    newCoins: user.coins
  });

  await user.save();
  res.json({ reward, state: publicState(user) });
}));

/**
 * GET /api/leaderboard
 * Returns the top 20 players by total coins mined.
 * Public endpoint, no authentication required.
 */
router.get('/leaderboard', asyncHandler(async (req, res) => {
  console.log('[api] /leaderboard request');
  const top = await User.find({}).sort({ totalMined: -1 }).limit(20).select('firstName totalMined telegramId');
  res.json({
    players: top.map((u) => ({ name: u.firstName, coins: u.totalMined, telegramId: u.telegramId })),
  });
}));

router.use((err, req, res, next) => {
  console.error('API error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;
