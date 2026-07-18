const User = require('../models/User');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');
const { calculateShopCost } = require('../utils/helpers');

/**
 * Shop Configuration
 * Defines all available shop items and their properties
 */
const SHOP_ITEMS = [
  {
    id: 'multitap',
    name: 'Multitap',
    description: '+1 coin per tap',
    icon: 'assets/icons/pickaxe.svg',
    effect: 'tapPower',
    baseCost: 100,
    maxLevel: 50,
    costMultiplier: 1.5,
    category: 'mining',
  },
  {
    id: 'energylimit',
    name: 'Energy Limit',
    description: '+500 max energy',
    icon: 'assets/icons/energy.svg',
    effect: 'maxEnergy',
    baseCost: 200,
    maxLevel: 20,
    costMultiplier: 1.6,
    category: 'mining',
  },
  {
    id: 'recharge',
    name: 'Recharge Speed',
    description: 'Energy regens faster',
    icon: 'assets/icons/lightning.svg',
    effect: 'regenTier',
    baseCost: 300,
    maxLevel: 10,
    costMultiplier: 2.0,
    category: 'mining',
  },
  {
    id: 'offline_mining',
    name: 'Offline Mining',
    description: 'Mine while offline',
    icon: 'assets/icons/clock.svg',
    effect: 'offlineMining',
    baseCost: 1000,
    maxLevel: 5,
    costMultiplier: 2.5,
    category: 'mining',
  },
  {
    id: 'tap_multiplier',
    name: 'Tap Multiplier',
    description: '2x tap power',
    icon: 'assets/icons/multiply.svg',
    effect: 'tapMultiplier',
    baseCost: 5000,
    maxLevel: 3,
    costMultiplier: 3.0,
    category: 'boost',
  },
  {
    id: 'auto_mining',
    name: 'Auto Mining',
    description: 'Automatic mining',
    icon: 'assets/icons/robot.svg',
    effect: 'autoTap',
    baseCost: 10000,
    maxLevel: 5,
    costMultiplier: 3.5,
    category: 'boost',
  },
  {
    id: 'premium',
    name: 'Premium Badge',
    description: 'Show VIP status',
    icon: 'assets/badges/badge_premium.svg',
    effect: 'badge',
    baseCost: 50000,
    maxLevel: 1,
    costMultiplier: 1.0,
    category: 'cosmetic',
  },
  {
    id: 'backpack',
    name: 'Backpack',
    description: 'Cosmetic gear',
    icon: 'assets/icons/backpack.svg',
    effect: 'badge',
    baseCost: 10000,
    maxLevel: 1,
    costMultiplier: 1.0,
    category: 'cosmetic',
  },
  {
    id: 'shield',
    name: 'Shield',
    description: 'Cosmetic gear',
    icon: 'assets/icons/shield.svg',
    effect: 'badge',
    baseCost: 10000,
    maxLevel: 1,
    costMultiplier: 1.0,
    category: 'cosmetic',
  },
];

/**
 * Shop Service
 * Handles shop operations: listing items, purchasing, calculating costs
 */
class ShopService {
  /**
   * Get all shop items with user-specific pricing
   */
  async getShopItems(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      const userLevels = user ? Object.fromEntries(user.shopLevels || {}) : {};

      const items = SHOP_ITEMS.map(item => {
        const currentLevel = userLevels[item.id] || 0;
        const cost = this.calculateItemCost(item, currentLevel);
        const isMaxed = currentLevel >= item.maxLevel;

        return {
          id: item.id,
          name: item.name,
          description: item.description,
          icon: item.icon,
          effect: item.effect,
          category: item.category,
          level: currentLevel,
          maxLevel: item.maxLevel,
          isMaxed,
          cost: isMaxed ? 0 : cost,
          baseCost: item.baseCost,
        };
      });

      return {
        success: true,
        items: items.sort((a, b) => a.baseCost - b.baseCost),
      };

    } catch (error) {
      console.error('[ShopService] Get shop items error:', error);
      throw error;
    }
  }

  /**
   * Calculate item cost based on current level
   */
  calculateItemCost(item, currentLevel) {
    if (currentLevel >= item.maxLevel) return 0;
    return Math.floor(item.baseCost * Math.pow(item.costMultiplier, currentLevel));
  }

  /**
   * Purchase a shop item
   */
  async purchaseItem(userId, telegramId, itemId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        throw new Error('User not found');
      }

      // Find item
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Get current level
      const currentLevel = (user.shopLevels && user.shopLevels.get(itemId)) || 0;

      // Check if maxed
      if (currentLevel >= item.maxLevel) {
        throw new Error('Item already maxed');
      }

      // Calculate cost
      const cost = this.calculateItemCost(item, currentLevel);

      // Check if user has enough coins
      if (user.coins < cost) {
        throw new Error('Not enough coins');
      }

      // Deduct cost
      user.coins -= cost;

      // Update level
      if (!user.shopLevels) user.shopLevels = new Map();
      user.shopLevels.set(itemId, currentLevel + 1);

      // Apply item effect
      this.applyItemEffect(user, item, currentLevel + 1);

      await user.save();

      // Log purchase
      await this.logPurchase(user, item, cost, currentLevel + 1);

      return {
        success: true,
        purchased: itemId,
        newLevel: currentLevel + 1,
        cost,
        state: this.getUserState(user),
      };

    } catch (error) {
      console.error('[ShopService] Purchase item error:', error);
      throw error;
    }
  }

  /**
   * Apply item effect to user
   */
  applyItemEffect(user, item, newLevel) {
    switch (item.effect) {
      case 'tapPower':
        user.tapPower += 1;
        break;
      case 'maxEnergy':
        user.maxEnergy += 500;
        user.energy += 500; // Refill energy on upgrade
        break;
      case 'regenTier':
        user.regenTier += 1;
        break;
      case 'offlineMining':
        user.offlineMiningEnabled = true;
        user.offlineMiningRate += 100 * newLevel; // 100 coins per hour per level
        break;
      case 'tapMultiplier':
        user.tapMultiplier = newLevel + 1; // 2x, 3x, 4x
        break;
      case 'autoTap':
        user.autoTapEnabled = true;
        user.autoTapPower = 10 * newLevel; // 10, 20, 30, 40, 50
        break;
      case 'badge':
        if (!user.badges.includes(item.id)) {
          user.badges.push(item.id);
        }
        break;
      default:
        console.warn('[ShopService] Unknown item effect:', item.effect);
    }
  }

  /**
   * Get user state for response
   */
  getUserState(user) {
    return {
      coins: user.coins,
      tapPower: user.tapPower,
      tapMultiplier: user.tapMultiplier,
      maxEnergy: user.maxEnergy,
      energy: user.energy,
      regenTier: user.regenTier,
      offlineMiningEnabled: user.offlineMiningEnabled,
      offlineMiningRate: user.offlineMiningRate,
      autoTapEnabled: user.autoTapEnabled,
      autoTapPower: user.autoTapPower,
      shopLevels: Object.fromEntries(user.shopLevels || {}),
      badges: user.badges,
    };
  }

  /**
   * Log purchase
   */
  async logPurchase(user, item, cost, newLevel) {
    try {
      await Log.create({
        logId: uuidv4(),
        level: 'info',
        category: 'shop',
        message: `Item purchased: ${item.name}`,
        telegramId: user.telegramId,
        metadata: new Map([
          ['itemId', item.id],
          ['itemName', item.name],
          ['cost', cost],
          ['newLevel', newLevel],
        ]),
      });
    } catch (error) {
      console.error('[ShopService] Failed to log purchase:', error);
    }
  }

  /**
   * Get shop item by ID
   */
  getItemById(itemId) {
    return SHOP_ITEMS.find(item => item.id === itemId);
  }

  /**
   * Get items by category
   */
  getItemsByCategory(category) {
    return SHOP_ITEMS.filter(item => item.category === category);
  }

  /**
   * Get all categories
   */
  getCategories() {
    const categories = [...new Set(SHOP_ITEMS.map(item => item.category))];
    return categories;
  }
}

module.exports = new ShopService();
