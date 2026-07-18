const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env');

function findDuplicateEnvKeys(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const keys = new Map();

  lines.forEach((line, index) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match) return;

    const key = match[1];
    const entries = keys.get(key) || [];
    entries.push(index + 1);
    keys.set(key, entries);
  });

  return Object.fromEntries(
    [...keys.entries()].filter(([, lineNumbers]) => lineNumbers.length > 1)
  );
}

function loadEnv() {
  const result = dotenv.config({ path: envPath });
  if (result.error && result.error.code !== 'ENOENT') {
    throw result.error;
  }

  const duplicates = findDuplicateEnvKeys(envPath);
  const duplicateKeys = Object.keys(duplicates);
  if (duplicateKeys.length > 0) {
    console.warn('[env] Duplicate .env keys detected:');
    for (const key of duplicateKeys) {
      console.warn(`[env]   ${key} appears on lines ${duplicates[key].join(', ')}`);
    }
  }

  return {
    envPath,
    duplicates,
    loadedKeys: result.parsed ? Object.keys(result.parsed) : [],
  };
}

function requireEnv(keys) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = {
  envPath,
  loadEnv,
  requireEnv,
  findDuplicateEnvKeys,
};
