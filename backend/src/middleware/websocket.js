/**
 * middleware/websocket.js
 * WebSocket server — broadcasts live metrics, service status,
 * alerts, and log entries to all connected clients.
 */

const { WebSocketServer } = require('ws');
const metrics  = require('../metrics/collector');
const svc      = require('../services/healthChecker');
const alertEng = require('../alerts/engine');
const logStr   = require('../logs/stream');
const logger   = require('../lib/logger');

let wss = null;

function broadcast(type, data) {
  if (!wss) return;
  const msg = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

function init(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', async (ws, req) => {
    const ip = req.socket.remoteAddress;
    logger.info({ ip, total: wss.clients.size }, 'WS client connected');

    // Send full initial snapshot immediately
    try {
      const [snapshot, services] = await Promise.all([
        metrics.getFullSnapshot(),
        svc.getServices(),
      ]);
      ws.send(JSON.stringify({ type: 'snapshot', data: { ...snapshot, services }, timestamp: new Date().toISOString() }));
      ws.send(JSON.stringify({ type: 'alerts',   data: alertEng.getAlerts(),      timestamp: new Date().toISOString() }));
      ws.send(JSON.stringify({ type: 'logs',     data: logStr.getLogs({ limit: 30 }), timestamp: new Date().toISOString() }));
    } catch (err) {
      logger.error({ err }, 'WS initial snapshot failed');
    }

    ws.on('close', () => logger.info({ remaining: wss.clients.size }, 'WS client disconnected'));
    ws.on('error', err => logger.error({ err }, 'WS client error'));
  });

  // ── Metrics broadcast every 5 seconds ──────────────────────
  setInterval(async () => {
    if (!wss.clients.size) return;
    try {
      const snapshot  = await metrics.getFullSnapshot();
      const newAlerts = alertEng.evaluate(snapshot);
      broadcast('metrics',  snapshot);
      if (newAlerts.length) broadcast('alerts', alertEng.getAlerts());
    } catch (err) {
      logger.error({ err }, 'WS metrics broadcast failed');
    }
  }, 5_000);

  // ── Service health broadcast every 15 seconds ───────────────
  setInterval(async () => {
    if (!wss.clients.size) return;
    try {
      broadcast('services', await svc.getServices());
    } catch (err) {
      logger.error({ err }, 'WS services broadcast failed');
    }
  }, 15_000);

  // ── Log stream broadcast every 3-7 seconds ──────────────────
  setInterval(() => {
    if (!wss.clients.size) return;
    try {
      const log = logStr.streamRandomLog();
      broadcast('log', log);
    } catch (err) {
      logger.error({ err }, 'WS log broadcast failed');
    }
  }, 3_000 + Math.random() * 4_000);

  logger.info('WebSocket server initialized');
  return wss;
}

function shutdown(reason = 'Server shutting down') {
  if (!wss) return;
  wss.clients.forEach(client => {
    try {
      if (client.readyState === 1) client.close(1001, reason);
    } catch (err) {
      logger.error({ err }, 'WS client close error during shutdown');
    }
  });
  try {
    wss.close();
  } catch (err) {
    logger.error({ err }, 'WS server close error during shutdown');
  }
}

module.exports = { init, broadcast, shutdown };
