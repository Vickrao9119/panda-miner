const dns = require('dns');
const net = require('net');
const mongoose = require('mongoose');
const mongodbPackage = require('mongodb/package.json');

const DEFAULT_DNS_TIMEOUT_MS = 8000;
const DEFAULT_CONNECT_INTERVAL_MS = 10000;

let connectPromise = null;
let reconnectTimer = null;
let activeUri = null;
let lastDiagnostics = {
  status: 'not-started',
  lastError: null,
  usingStandardUri: false,
};

function maskMongoUri(uri) {
  return uri ? uri.replace(/:([^:@/?#]+)@/, ':****@') : '';
}

function parseBoolean(value, defaultValue = false) {
  if (value == null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function configureMongoose() {
  mongoose.set('bufferCommands', false);
  mongoose.set('bufferTimeoutMS', 0);

  mongoose.connection.on('connected', () => {
    lastDiagnostics.status = 'connected';
    lastDiagnostics.lastError = null;
    console.log(`[mongo] connected host=${mongoose.connection.host} db=${mongoose.connection.name}`);
  });

  mongoose.connection.on('disconnected', () => {
    lastDiagnostics.status = 'disconnected';
    console.warn('[mongo] disconnected');
    if (activeUri) scheduleReconnect(activeUri);
  });

  mongoose.connection.on('reconnected', () => {
    lastDiagnostics.status = 'connected';
    console.log('[mongo] reconnected');
  });

  mongoose.connection.on('error', (err) => {
    lastDiagnostics.status = 'error';
    lastDiagnostics.lastError = summarizeError(err);
    console.error('[mongo] connection error:', err.message);
  });
}

function applyDnsServers() {
  const servers = parseCsv(process.env.MONGO_DNS_SERVERS);
  if (servers.length === 0) return;

  dns.setServers(servers);
  console.log(`[dns] Node DNS servers overridden: ${dns.getServers().join(', ')}`);
}

function parseMongoUri(uri) {
  const parsed = new URL(uri);
  return {
    protocol: parsed.protocol,
    usernameSet: Boolean(parsed.username),
    passwordSet: Boolean(parsed.password),
    host: parsed.host,
    database: parsed.pathname.replace(/^\//, '') || null,
    searchParams: Object.fromEntries(parsed.searchParams.entries()),
  };
}

async function withTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function testTcp(host, port, timeoutMs = DEFAULT_DNS_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: timeoutMs }, () => {
      socket.destroy();
      resolve({ ok: true });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ ok: false, error: `timeout after ${timeoutMs}ms` });
    });

    socket.on('error', (err) => {
      resolve({ ok: false, error: `${err.code || err.name}: ${err.message}` });
    });
  });
}

async function inspectSrv(uri) {
  const parsed = new URL(uri);
  if (parsed.protocol !== 'mongodb+srv:') return null;

  const clusterHost = parsed.hostname;
  const srvName = `_mongodb._tcp.${clusterHost}`;
  const timeoutMs = Number(process.env.MONGO_DNS_TIMEOUT_MS || DEFAULT_DNS_TIMEOUT_MS);

  console.log(`[dns] Node DNS servers: ${dns.getServers().join(', ') || '(system default)'}`);
  console.log(`[dns] resolving SRV ${srvName}`);

  const srvRecords = await withTimeout(dns.promises.resolveSrv(srvName), timeoutMs, 'SRV lookup');
  const txtRecords = await withTimeout(
    dns.promises.resolveTxt(clusterHost).catch((err) => {
      if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') return [];
      throw err;
    }),
    timeoutMs,
    'TXT lookup'
  );

  console.log(`[dns] SRV records: ${srvRecords.length}`);
  for (const record of srvRecords) {
    console.log(`[dns]   ${record.name}:${record.port} priority=${record.priority} weight=${record.weight}`);
  }
  console.log(`[dns] TXT records: ${txtRecords.length}`);

  const first = srvRecords[0];
  if (first) {
    const addresses = await withTimeout(dns.promises.resolve4(first.name), timeoutMs, 'A lookup');
    console.log(`[dns] A ${first.name}: ${addresses.join(', ')}`);

    const tcp = await testTcp(first.name, first.port, timeoutMs);
    console.log(`[network] TCP ${first.name}:${first.port} ${tcp.ok ? 'ok' : `failed (${tcp.error})`}`);
  }

  return { clusterHost, srvRecords, txtRecords };
}

function buildStandardUriFromSrv(srvInfo, originalUri) {
  const parsed = new URL(originalUri);
  const hosts = srvInfo.srvRecords
    .map((record) => `${record.name}:${record.port}`)
    .join(',');

  const params = new URLSearchParams(parsed.searchParams);
  for (const txtRecord of srvInfo.txtRecords) {
    for (const segment of txtRecord) {
      const txtParams = new URLSearchParams(segment);
      for (const [key, value] of txtParams.entries()) {
        if (!params.has(key)) params.set(key, value);
      }
    }
  }

  // Remove TLS params for direct connection - let driver handle it
  params.delete('tls');
  params.delete('ssl');

  const database = parsed.pathname || '/';
  const auth = parsed.username
    ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}@`
    : '';

  return `mongodb://${auth}${hosts}${database}?${params.toString()}`;
}

function summarizeError(err) {
  return {
    name: err.name,
    code: err.code,
    message: err.message,
  };
}

function getMongooseOptions() {
  const options = {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 15000),
    connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 15000),
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 10),
    minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 0),
    retryWrites: true,
    retryReads: true,
    // Explicit TLS configuration for Atlas compatibility
    tls: true,
    tlsCAFile: undefined, // Let driver use system CA
  };

  console.log('[mongo] using explicit TLS configuration');
  return options;
}

async function prepareConnectionUri(uri) {
  const parsed = parseMongoUri(uri);
  console.log('[mongo] connection string:', JSON.stringify(parsed));
  console.log(`[mongo] sanitized URI: ${maskMongoUri(uri)}`);

  if (parsed.protocol !== 'mongodb+srv:') {
    lastDiagnostics.usingStandardUri = parsed.protocol === 'mongodb:';
    return uri;
  }

  // Convert to direct connection with explicit TLS parameters
  const srvInfo = await inspectSrv(uri);
  const standardUri = buildStandardUriFromSrv(srvInfo, uri);
  lastDiagnostics.usingStandardUri = true;
  console.log('[mongo] using direct connection with explicit TLS');
  console.log(`[mongo] sanitized standard URI: ${maskMongoUri(standardUri)}`);
  return standardUri;
}

async function connectOnce(uri) {
  if (mongoose.connection.readyState === 1) return true;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    lastDiagnostics.status = 'connecting';
    const preparedUri = await prepareConnectionUri(uri);
    const options = getMongooseOptions();
    console.log('[mongo] driver:', `mongodb@${mongodbPackage.version}`, `mongoose@${mongoose.version}`);
    console.log('[mongo] options:', JSON.stringify(options));

    await mongoose.connect(preparedUri, options);
    return true;
  })()
    .catch((err) => {
      lastDiagnostics.status = 'error';
      lastDiagnostics.lastError = summarizeError(err);
      console.error('[mongo] connect failed:', `${err.name}${err.code ? ` ${err.code}` : ''}: ${err.message}`);
      return false;
    })
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
}

function scheduleReconnect(uri, intervalMs = Number(process.env.MONGO_RECONNECT_MS || DEFAULT_CONNECT_INTERVAL_MS)) {
  if (reconnectTimer) return;

  reconnectTimer = setInterval(async () => {
    if (mongoose.connection.readyState === 1 || connectPromise) return;
    console.log('[mongo] reconnect attempt...');
    const connected = await connectOnce(uri);
    if (connected && reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  }, intervalMs);

  reconnectTimer.unref?.();
}

async function startMongo(uri) {
  configureMongoose();
  applyDnsServers();
  activeUri = uri;

  if (!uri) {
    lastDiagnostics.status = 'disabled';
    console.warn('[mongo] MONGO_URI not set. Database features are disabled.');
    return false;
  }

  console.log('[runtime]', `node=${process.version}`, `platform=${process.platform}`, `arch=${process.arch}`);
  const connected = await connectOnce(uri);
  if (!connected) {
    console.warn('[mongo] ⚠️  MongoDB connection failed after initial attempt');
    console.warn('[mongo] Server will continue running but database features will be unavailable');
    console.warn('[mongo] Check MongoDB Atlas cluster status, IP whitelist, and network connectivity');
    scheduleReconnect(uri);
  }
  return connected;
}

async function stopMongo() {
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
  await mongoose.disconnect();
}

function getMongoDiagnostics() {
  return {
    ...lastDiagnostics,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || null,
    database: mongoose.connection.name || null,
  };
}

module.exports = {
  startMongo,
  stopMongo,
  getMongoDiagnostics,
  maskMongoUri,
  parseMongoUri,
  buildStandardUriFromSrv,
};
