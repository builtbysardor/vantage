/**
 * services/healthChecker.js
 * Checks service health. Uses net.connect for real port checks.
 * Structured so real HTTP/TCP probes can replace simulated data.
 */

const net = require('net');

const SERVICES = [
  { id: 'nginx',      name: 'nginx',       displayName: 'NGINX Web Server',    port: 80,   host: 'localhost', version: '1.25.3', description: 'Reverse proxy & load balancer',    expectedStatus: 'online' },
  { id: 'postgresql', name: 'postgresql',  displayName: 'PostgreSQL Database', port: 5432, host: 'localhost', version: '16.2',   description: 'Primary relational database',       expectedStatus: 'online' },
  { id: 'redis',      name: 'redis',       displayName: 'Redis Cache',         port: 6379, host: 'localhost', version: '7.2.4',  description: 'In-memory cache & session store',   expectedStatus: 'online' },
  { id: 'rabbitmq',   name: 'rabbitmq',    displayName: 'RabbitMQ',            port: 5672, host: 'localhost', version: '3.13.0', description: 'Message queue broker',              expectedStatus: 'online' },
  { id: 'api-gw',     name: 'api-gateway', displayName: 'API Gateway',         port: 8080, host: 'localhost', version: '2.4.1',  description: 'Central API entry point',           expectedStatus: 'online' },
  { id: 'mail',       name: 'mail-worker', displayName: 'Mail Worker',         port: 2525, host: 'localhost', version: '1.2.0',  description: 'Outbound email dispatcher',          expectedStatus: 'online' },
];

// Track uptime counters between checks
const serviceState = {};
SERVICES.forEach(svc => {
  serviceState[svc.id] = {
    restarts:   svc.id === 'mail' ? 7 : svc.id === 'rabbitmq' ? 2 : svc.id === 'api-gw' ? 1 : 0,
    checks:     0,
    okChecks:   0,
    lastOnline: svc.id === 'mail' ? new Date(Date.now() - 180_000).toISOString() : new Date().toISOString(),
  };
});

// ─── TCP port probe ──────────────────────────────────────────
function tcpProbe(host, port, timeoutMs = 1500) {
  return new Promise(resolve => {
    const start  = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      const latency = Date.now() - start;
      socket.destroy();
      resolve({ ok: true, latency });
    });
    socket.on('timeout', () => { socket.destroy(); resolve({ ok: false, latency: timeoutMs }); });
    socket.on('error',   () => { socket.destroy(); resolve({ ok: false, latency: Date.now() - start }); });
    socket.connect(port, host);
  });
}

// ─── Check all services ──────────────────────────────────────
async function checkAll() {
  const results = await Promise.all(SERVICES.map(async svc => {
    const state = serviceState[svc.id];
    state.checks++;

    let online  = false;
    let latency = 0;

    try {
      const probe = await tcpProbe(svc.host, svc.port, 1500);
      online  = probe.ok;
      latency = probe.latency;
    } catch {
      online = false;
    }

    if (online) {
      state.okChecks++;
      state.lastOnline = new Date().toISOString();
    }

    const uptimePct = state.checks > 0
      ? Math.round((state.okChecks / state.checks) * 1000) / 10
      : 0;

    // Health score: blend uptime + latency penalty
    let healthScore = Math.round(uptimePct);
    if (online && latency > 200) healthScore = Math.max(40, healthScore - 30);
    else if (online && latency > 80)  healthScore = Math.max(60, healthScore - 10);

    const status = !online ? 'offline'
      : latency > 200 ? 'degraded'
      : 'online';

    return {
      id:          svc.id,
      name:        svc.name,
      displayName: svc.displayName,
      description: svc.description,
      version:     svc.version,
      port:        svc.port,
      status,
      latency:     online ? latency : 0,
      uptime:      uptimePct,
      healthScore,
      restarts:    state.restarts,
      lastCheck:   new Date().toISOString(),
      lastOnline:  state.lastOnline,
    };
  }));

  return results;
}

// ─── Cache last results ──────────────────────────────────────
let lastResults = SERVICES.map(svc => ({
  ...svc,
  status:      svc.id === 'mail' ? 'offline' : svc.id === 'rabbitmq' ? 'degraded' : 'online',
  latency:     svc.id === 'mail' ? 0 : svc.id === 'rabbitmq' ? 62 : Math.floor(Math.random() * 20 + 2),
  uptime:      svc.id === 'mail' ? 81.2 : svc.id === 'rabbitmq' ? 97.4 : 99.8,
  healthScore: svc.id === 'mail' ? 12 : svc.id === 'rabbitmq' ? 61 : 96,
  restarts:    serviceState[svc.id].restarts,
  lastCheck:   new Date().toISOString(),
}));

async function getServices() {
  try {
    lastResults = await checkAll();
  } catch {
    // Return cached on error
  }
  return lastResults;
}

module.exports = { getServices };
