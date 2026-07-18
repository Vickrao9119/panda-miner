const XP_PER_TAP = 2;
const COINS_PER_TAP_BASE = 1;
const ENERGY_PER_TAP = 5;
const ENERGY_REGEN_MS = 1500; // one regen tick
const MAX_ENERGY_BASE = 1000;
const MYSTERY_BOX_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h

const SHOP_ITEMS = [
  { id: 'multitap', name: 'Multitap', baseCost: 500, costMult: 1.6, maxLevel: 10, effect: 'tapPower' },
  { id: 'energylimit', name: 'Energy limit', baseCost: 400, costMult: 1.6, maxLevel: 10, effect: 'maxEnergy' },
  { id: 'recharge', name: 'Recharge speed', baseCost: 600, costMult: 1.7, maxLevel: 6, effect: 'regenSpeed' },
  { id: 'premium', name: 'Premium badge', baseCost: 5000, costMult: 1, maxLevel: 1, effect: 'badge' },
  { id: 'backpack', name: 'Crypto backpack', baseCost: 2500, costMult: 1, maxLevel: 1, effect: 'badge' },
  { id: 'shield', name: 'Shield skin', baseCost: 3000, costMult: 1, maxLevel: 1, effect: 'badge' },
];

function xpForLevel(level) {
  return Math.round(100 * Math.pow(1.35, level - 1));
}

function shopItemCost(item, currentLevel) {
  return Math.round(item.baseCost * Math.pow(item.costMult, currentLevel));
}

module.exports = {
  XP_PER_TAP,
  COINS_PER_TAP_BASE,
  ENERGY_PER_TAP,
  ENERGY_REGEN_MS,
  MAX_ENERGY_BASE,
  MYSTERY_BOX_COOLDOWN_MS,
  SHOP_ITEMS,
  xpForLevel,
  shopItemCost,
};
