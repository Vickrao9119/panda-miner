/**
 * Helper Functions
 * Common utility functions used across the application
 */

/**
 * Async handler wrapper for Express routes
 * Catches errors and passes them to Express error middleware
 */
function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

/**
 * Generate a unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num ? num.toLocaleString('en-US') : '0';
}

/**
 * Format large numbers (K, M, B)
 */
function formatLargeNumber(num) {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Calculate XP required for a level
 */
function xpForLevel(level) {
  // Exponential curve: 100 * level^1.5
  return Math.floor(100 * Math.pow(level, 1.5));
}

/**
 * Calculate coins per hour based on user stats
 */
function calculateCoinsPerHour(user) {
  const baseRate = user.tapPower * 3600; // Assuming 1 tap per second
  const offlineRate = user.offlineMiningRate;
  const autoTapRate = user.autoTapEnabled ? user.autoTapPower * 3600 : 0;
  const multiplier = user.tapMultiplier;
  
  return Math.floor((baseRate + offlineRate + autoTapRate) * multiplier);
}

/**
 * Calculate energy regeneration rate
 */
function calculateEnergyRegenRate(user) {
  return user.energyRegenRate * (1 + user.regenTier);
}

/**
 * Calculate shop item cost
 */
function calculateShopCost(baseCost, level) {
  // Exponential cost curve
  return Math.floor(baseCost * Math.pow(1.5, level));
}

/**
 * Validate email address
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Telegram username
 */
function isValidTelegramUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_]{5,32}$/;
  return usernameRegex.test(username);
}

/**
 * Sanitize user input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Mask sensitive data for logging
 */
function maskSensitiveData(data) {
  if (!data) return data;
  
  if (typeof data === 'string') {
    if (data.includes('token') || data.includes('secret') || data.includes('password')) {
      return '***MASKED***';
    }
    return data;
  }
  
  if (typeof data === 'object') {
    const masked = {};
    for (const key in data) {
      if (key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('secret') || 
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('initdata')) {
        masked[key] = '***MASKED***';
      } else {
        masked[key] = data[key];
      }
    }
    return masked;
  }
  
  return data;
}

/**
 * Parse MongoDB URI to extract connection info
 */
function parseMongoUri(uri) {
  try {
    const url = new URL(uri);
    return {
      protocol: url.protocol,
      username: url.username ? '***' : null,
      password: url.password ? '***' : null,
      host: url.hostname,
      port: url.port,
      database: url.pathname?.replace('/', '') || null,
      searchParams: Object.fromEntries(url.searchParams),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Calculate time difference in human-readable format
 */
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'just now';
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
async function retry(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i));
    }
  }
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Deep clone object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge objects deeply
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
}

/**
 * Check if value is object
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Generate random string
 */
function randomString(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate IP address
 */
function isValidIP(ip) {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

/**
 * Extract IP from request
 */
function extractIP(req) {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         'unknown';
}

module.exports = {
  asyncHandler,
  generateId,
  formatNumber,
  formatLargeNumber,
  xpForLevel,
  calculateCoinsPerHour,
  calculateEnergyRegenRate,
  calculateShopCost,
  isValidEmail,
  isValidTelegramUsername,
  sanitizeInput,
  maskSensitiveData,
  parseMongoUri,
  timeAgo,
  sleep,
  retry,
  debounce,
  throttle,
  deepClone,
  deepMerge,
  isObject,
  randomString,
  isValidIP,
  extractIP,
};
