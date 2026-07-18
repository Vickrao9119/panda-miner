const express = require('express');
const path = require('path');
const cors = require('cors');

const { loadEnv, requireEnv } = require('./config/env');
const { startMongo, stopMongo, getMongoDiagnostics } = require('./db/mongo');
const apiRoutes = require('./routes/index');

const envInfo = loadEnv();
requireEnv(['PORT']);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MONGO_URI = process.env.MONGO_URI;

console.log(`[env] loaded ${envInfo.loadedKeys.length} keys from ${envInfo.envPath}`);
console.log(`[env] MONGO_URI ${MONGO_URI ? 'is configured' : 'is not configured'}`);

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: getMongoDiagnostics(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiRoutes);

const clientDir = path.join(__dirname, '..', 'client');
app.use(express.static(clientDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

function listen() {
  const server = app.listen(PORT, () => {
    console.log(`[server] Panda Miner running on http://localhost:${PORT}`);
    console.log(`[server] Health check: http://localhost:${PORT}/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server] Port ${PORT} is already in use.`);
      console.error('[server] Stop the existing server or set another PORT in server/.env.');
      process.exit(1);
    }

    console.error('[server] Failed to start:', err);
    process.exit(1);
  });

  return server;
}

async function start() {
  const server = listen();
  startMongo(MONGO_URI).catch((err) => {
    console.error('[mongo] unexpected startup failure:', err);
  });

  async function shutdown(signal) {
    console.log(`[server] ${signal} received, shutting down...`);
    server.close(async () => {
      await stopMongo().catch((err) => console.error('[mongo] shutdown error:', err));
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
