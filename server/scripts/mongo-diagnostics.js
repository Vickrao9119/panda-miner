const dns = require('dns');
const net = require('net');
const mongoose = require('mongoose');

const { loadEnv } = require('../config/env');
const { maskMongoUri, parseMongoUri, buildStandardUriFromSrv } = require('../db/mongo');

loadEnv();

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function applyDnsOverride() {
  const servers = parseCsv(process.env.MONGO_DNS_SERVERS);
  if (servers.length > 0) dns.setServers(servers);
  console.log('[dns] servers:', dns.getServers().join(', ') || '(system default)');
}

async function tcpCheck(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 8000 }, () => {
      socket.destroy();
      resolve({ ok: true });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
    socket.on('error', (err) => resolve({ ok: false, error: `${err.code}: ${err.message}` }));
  });
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');

  console.log('[runtime]', process.version, process.platform, process.arch);
  console.log('[mongo] uri:', maskMongoUri(uri));
  console.log('[mongo] parsed:', JSON.stringify(parseMongoUri(uri), null, 2));

  applyDnsOverride();

  let connectUri = uri;
  const parsed = new URL(uri);
  if (parsed.protocol === 'mongodb+srv:') {
    const clusterHost = parsed.hostname;
    const srvName = `_mongodb._tcp.${clusterHost}`;
    const srvRecords = await dns.promises.resolveSrv(srvName);
    const txtRecords = await dns.promises.resolveTxt(clusterHost).catch((err) => {
      if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') return [];
      throw err;
    });

    console.log('[dns] srv:', JSON.stringify(srvRecords, null, 2));
    console.log('[dns] txt:', JSON.stringify(txtRecords, null, 2));

    for (const record of srvRecords) {
      const addresses = await dns.promises.resolve4(record.name);
      const tcp = await tcpCheck(record.name, record.port);
      console.log(`[network] ${record.name}:${record.port}`, JSON.stringify({ addresses, tcp }));
    }

    connectUri = buildStandardUriFromSrv({ srvRecords, txtRecords }, uri);
    console.log('[mongo] standard uri:', maskMongoUri(connectUri));
  }

  mongoose.set('bufferCommands', false);
  mongoose.set('bufferTimeoutMS', 0);
  await mongoose.connect(connectUri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    minPoolSize: 0,
    maxPoolSize: 10,
  });

  console.log('[mongoose] connected:', JSON.stringify({
    host: mongoose.connection.host,
    database: mongoose.connection.name,
    readyState: mongoose.connection.readyState,
  }));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[diagnostics] failed:', `${err.name}${err.code ? ` ${err.code}` : ''}: ${err.message}`);
  process.exit(1);
});
