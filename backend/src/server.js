'use strict';

// Load environment variables before anything else
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const http      = require('http');
const rateLimit = require('express-rate-limit');
const pinoHttp  = require('pino-http');

const logger  = require('./lib/logger');
const routes  = require('./routes/index');
const ws      = require('./middleware/websocket');

// ─── Env validation ──────────────────────────────────────────
const REQUIRED_ENV = ['API_KEYS', 'AGENT_TOKENS'];
const missing = REQUIRED_ENV.filter(k => !process.env[k] || !process.env[k].trim());
if (missing.length) {
  logger.fatal({ missing }, 'Missing required environment variables — refusing to start');
  process.exit(1);
}

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3001;

// ─── CORS allowlist ──────────────────────────────────────────
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow same-origin / curl / server-to-server requests with no Origin header
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
}));

app.use(express.json());

// ─── Structured request logging ──────────────────────────────
app.use(pinoHttp({
  logger,
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
}));

// ─── Global rate limiting (100 req/min/IP) ───────────────────
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
}));

app.use('/api', routes);
app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((err, _req, res, _next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

ws.init(server);

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Nexus Pro backend v2.0 started');
  logger.info(`REST API → http://localhost:${PORT}/api`);
  logger.info(`WebSocket → ws://localhost:${PORT}`);
});

// ─── Graceful shutdown ───────────────────────────────────────
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutdown signal received — closing server');

  const forceExit = setTimeout(() => {
    logger.error('Forcing exit after 10s grace period');
    process.exit(1);
  }, 10_000);
  forceExit.unref?.();

  ws.shutdown('Server shutting down');

  server.close(err => {
    if (err) {
      logger.error({ err }, 'Error during HTTP server close');
      return process.exit(1);
    }
    logger.info('HTTP server closed cleanly');
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = { app, server };
