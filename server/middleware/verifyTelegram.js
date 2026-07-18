const crypto = require('crypto');

/**
 * Lazy-load environment variables to ensure .env is loaded before use.
 * This fixes the issue where middleware reads env vars at module load time
 * before server.js has loaded the .env file.
 */
function getEnvVars() {
  return {
    BOT_TOKEN: process.env.BOT_TOKEN,
    NODE_ENV: process.env.NODE_ENV || 'development',
    ALLOW_DEV_AUTH: process.env.ALLOW_DEV_AUTH
  };
}

/**
 * Check if dev mode is enabled.
 * Dev mode allows fake user authentication for local development.
 * NEVER enable this in production.
 */
function isDevMode() {
  const env = getEnvVars();
  return env.NODE_ENV !== 'production' && env.ALLOW_DEV_AUTH === 'true';
}

/**
 * Verifies Telegram WebApp initData per Telegram's official algorithm:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Expects `initData` (the raw query string Telegram.WebApp.initData gives the client)
 * in the request body. Attaches `req.telegramUser` = { id, first_name, username, ... }
 * on success.
 *
 * Dev mode: When NODE_ENV=development and ALLOW_DEV_AUTH=true, allows requests
 * without initData by using a fake development user.
 */
function verifyTelegram(req, res, next) {
  const env = getEnvVars();
  const devMode = isDevMode();
  const initData = req.body && req.body.initData;

  // Log authentication attempt for debugging
  console.log('[auth] Request:', {
    path: req.path,
    hasInitData: !!initData,
    devMode: devMode,
    NODE_ENV: env.NODE_ENV,
    ALLOW_DEV_AUTH: env.ALLOW_DEV_AUTH
  });

  // Local/dev convenience: allow a fake user when explicitly enabled.
  // NEVER enable ALLOW_DEV_AUTH in production.
  if (!initData && devMode) {
    console.log('[auth] Dev mode: using fake user');
    req.telegramUser = { id: 'dev-user-1', first_name: 'Dev Miner', username: 'devminer' };
    return next();
  }

  if (!initData) {
    console.log('[auth] Missing initData (devMode:', devMode, ')');
    return res.status(401).json({ error: 'Missing initData' });
  }

  if (!env.BOT_TOKEN) {
    console.error('[auth] BOT_TOKEN not configured');
    return res.status(500).json({ error: 'Server misconfigured: BOT_TOKEN not set' });
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return res.status(401).json({ error: 'Invalid initData: no hash' });
    params.delete('hash');

    const dataCheckArr = [];
    for (const [key, value] of [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      dataCheckArr.push(`${key}=${value}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) {
      return res.status(401).json({ error: 'Invalid initData: hash mismatch' });
    }

    // Optional but recommended: reject stale initData (older than 24h)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const ageSeconds = Date.now() / 1000 - authDate;
    if (authDate && ageSeconds > 86400) {
      return res.status(401).json({ error: 'initData expired' });
    }

    const userJson = params.get('user');
    if (!userJson) return res.status(401).json({ error: 'Invalid initData: no user' });

    req.telegramUser = JSON.parse(userJson);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid initData: ' + err.message });
  }
}

module.exports = verifyTelegram;
