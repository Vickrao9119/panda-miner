const shopService = require('../services/shopService');

/**
 * Shop Controller
 * Handles shop-related endpoints
 */
class ShopController {
  /**
   * GET /api/shop/items
   * Get all shop items with user-specific pricing
   */
  async getItems(req, res) {
    try {
      const user = req.user;
      const result = await shopService.getShopItems(user.telegramId);
      return res.json(result);

    } catch (error) {
      console.error('[ShopController] Get items error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get shop items'
      });
    }
  }

  /**
   * POST /api/shop/purchase
   * Purchase a shop item
   */
  async purchase(req, res) {
    try {
      const user = req.user;
      const { itemId } = req.body;

      if (!itemId) {
        return res.status(400).json({
          success: false,
          error: 'Item ID is required'
        });
      }

      const result = await shopService.purchaseItem(
        user._id.toString(),
        user.telegramId,
        itemId
      );

      return res.json(result);

    } catch (error) {
      console.error('[ShopController] Purchase error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Purchase failed'
      });
    }
  }

  /**
   * GET /api/shop/categories
   * Get all shop categories
   */
  async getCategories(req, res) {
    try {
      const categories = shopService.getCategories();
      return res.json({
        success: true,
        categories
      });

    } catch (error) {
      console.error('[ShopController] Get categories error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get categories'
      });
    }
  }

  /**
   * GET /api/shop/item/:itemId
   * Get specific item details
   */
  async getItem(req, res) {
    try {
      const { itemId } = req.params;
      const item = shopService.getItemById(itemId);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }

      // Get user's current level for this item
      const user = req.user;
      const currentLevel = (user.shopLevels && user.shopLevels.get(itemId)) || 0;
      const cost = shopService.calculateItemCost(item, currentLevel);

      return res.json({
        success: true,
        item: {
          ...item,
          level: currentLevel,
          cost,
          isMaxed: currentLevel >= item.maxLevel,
        }
      });

    } catch (error) {
      console.error('[ShopController] Get item error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get item'
      });
    }
  }
}

module.exports = new ShopController();
