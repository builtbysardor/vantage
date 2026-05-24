/**
 * routes/index.js
 * All REST API routes for Nexus Pro.
 */

const router  = require('express').Router();
const rateLimit = require('express-rate-limit');
const metrics = require('../metrics/collector');
const alerts  = require('../alerts/engine');
const logs    = require('../logs/stream');
const svc     = require('../services/healthChecker');
const hosts   = require('../services/hosts');
const settingsStore = require('../lib/settingsStore');
const { requireApiKey, requireAgentToken } = require('../middleware/auth');
const requireJwt = require('../middleware/requireJwt');
const { validateUser } = require('../auth/users');
const { signToken } = require('../auth/jwt');
const {
  agentPushSchema,
  alertIdParamSchema,
  validateBody,
  validateParams,
} = require('../validators');

// Tighter rate limit for the agent push endpoint
const agentPushLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many agent pushes' },
});

// ─── Auth ─────────────────────────────────────────────────────
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in and receive a JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns token and expiry
 *       401:
 *         description: Invalid credentials
 */
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  if (!validateUser(username, password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ username });
  return res.json({ token, expiresIn: '8h' });
});

router.get('/auth/me', requireJwt, (req, res) => {
  res.json({ username: req.user.username, exp: req.user.exp });
});

router.post('/auth/logout', (_req, res) => {
  res.json({ ok: true });
});

// ─── Health ──────────────────────────────────────────────────
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 version:
 *                   type: string
 *                   example: 2.0.0
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
// TODO: auth on reads
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// ─── Full snapshot (dashboard overview) ──────────────────────
/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Full system snapshot
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: cpu, memory, disks, network, system, timestamp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cpu:
 *                   type: object
 *                 memory:
 *                   type: object
 *                 disks:
 *                   type: array
 *                   items:
 *                     type: object
 *                 network:
 *                   type: array
 *                   items:
 *                     type: object
 *                 system:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
// TODO: auth on reads
router.get('/metrics', async (_req, res) => {
  try {
    const snapshot = await metrics.getFullSnapshot();
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /metrics/history:
 *   get:
 *     summary: Time-series metrics history
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Array of time-series data points
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   cpu:
 *                     type: number
 *                   ram:
 *                     type: number
 *                   netIn:
 *                     type: number
 *                   netOut:
 *                     type: number
 */
// TODO: auth on reads
router.get('/metrics/history', (_req, res) => {
  res.json(metrics.history);
});

/**
 * @swagger
 * /system:
 *   get:
 *     summary: System information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: hostname, os, kernel, arch, uptime, bootTime, processes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hostname:
 *                   type: string
 *                 os:
 *                   type: string
 *                 kernel:
 *                   type: string
 *                 arch:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 bootTime:
 *                   type: string
 *                 processes:
 *                   type: number
 */
// TODO: auth on reads
router.get('/system', async (_req, res) => {
  try {
    res.json(await metrics.getSystemInfo());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /network:
 *   get:
 *     summary: Network interfaces
 *     tags: [Network]
 *     responses:
 *       200:
 *         description: Array of network interface objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
// TODO: auth on reads
router.get('/network', async (_req, res) => {
  try {
    res.json(await metrics.getNetworkMetrics());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Services ────────────────────────────────────────────────
/**
 * @swagger
 * /services:
 *   get:
 *     summary: Service health status
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Array of service health objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
// TODO: auth on reads
router.get('/services', async (_req, res) => {
  try {
    res.json(await svc.getServices());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /services/{id}/restart:
 *   post:
 *     summary: Restart a service
 *     tags: [Services]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restart signal sent
 *       401:
 *         description: Unauthorized
 */
// Service restart placeholder
router.post('/services/:id/restart', requireApiKey, (req, res) => {
  res.json({
    success: true,
    message: `Restart signal sent to ${req.params.id}`,
    note:    'Requires backend agent with elevated permissions',
    timestamp: new Date().toISOString(),
  });
});

// ─── Alerts ──────────────────────────────────────────────────
/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: List alerts
 *     tags: [Alerts]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Array of alert objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
// TODO: auth on reads
router.get('/alerts', (req, res) => {
  res.json(alerts.getAlerts(req.query));
});

/**
 * @swagger
 * /alerts/{id}/acknowledge:
 *   patch:
 *     summary: Acknowledge an alert
 *     tags: [Alerts]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated alert object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert not found
 */
router.patch(
  '/alerts/:id/acknowledge',
  requireApiKey,
  validateParams(alertIdParamSchema),
  (req, res) => {
    const a = alerts.acknowledge(req.params.id, req.body.user || 'admin');
    a ? res.json(a) : res.status(404).json({ error: 'Alert not found' });
  }
);

/**
 * @swagger
 * /alerts/{id}/resolve:
 *   patch:
 *     summary: Resolve an alert
 *     tags: [Alerts]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated alert object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert not found
 */
router.patch(
  '/alerts/:id/resolve',
  requireApiKey,
  validateParams(alertIdParamSchema),
  (req, res) => {
    const a = alerts.resolve(req.params.id);
    a ? res.json(a) : res.status(404).json({ error: 'Alert not found' });
  }
);

/**
 * @swagger
 * /alerts/thresholds:
 *   get:
 *     summary: Alert threshold configuration
 *     tags: [Alerts]
 *     responses:
 *       200:
 *         description: Alert threshold config object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
// TODO: auth on reads
router.get('/alerts/thresholds', (_req, res) => {
  res.json(alerts.THRESHOLDS);
});


// ─── Settings ────────────────────────────────────────────────
/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get application settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Settings object including thresholds
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
const THRESHOLD_LABELS = [
  { key: 'cpu',         metric: 'CPU Usage',       unit: '%'  },
  { key: 'ram',         metric: 'RAM Usage',        unit: '%'  },
  { key: 'disk',        metric: 'Disk Usage',       unit: '%'  },
  { key: 'temperature', metric: 'CPU Temperature',  unit: '°C' },
  { key: 'latency',     metric: 'Latency',          unit: 'ms' },
];

const thresholdsToArray = () =>
  THRESHOLD_LABELS.map(({ key, metric, unit }) => ({
    metric, unit, ...alerts.THRESHOLDS[key],
  }));

router.get('/settings', (_req, res) => {
  res.json({ ...settingsStore.getSettings(), thresholds: thresholdsToArray() });
});

/**
 * @swagger
 * /settings:
 *   put:
 *     summary: Update application settings
 *     tags: [Settings]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated settings object
 *       401:
 *         description: Unauthorized
 */
router.put('/settings', requireApiKey, (req, res) => {
  const { thresholds, ...rest } = req.body;
  if (thresholds) alerts.updateThresholds(thresholds);
  const updated = Object.keys(rest).length ? settingsStore.updateSettings(rest) : settingsStore.getSettings();
  res.json({ ...updated, thresholds: thresholdsToArray() });
});

// ─── Logs ────────────────────────────────────────────────────
/**
 * @swagger
 * /logs:
 *   get:
 *     summary: Log entries
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *       - in: query
 *         name: host
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Array of log entry objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
// TODO: auth on reads
router.get('/logs', (req, res) => {
  const { level, source, host, limit } = req.query;
  res.json(logs.getLogs({ level, source, host, limit: parseInt(limit) || 100 }));
});

// ─── Hosts ───────────────────────────────────────────────────
/**
 * @swagger
 * /hosts:
 *   get:
 *     summary: Monitored hosts
 *     tags: [Hosts]
 *     responses:
 *       200:
 *         description: Array of monitored host objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
// TODO: auth on reads
router.get('/hosts', (_req, res) => {
  res.json(hosts.getLiveHosts());
});

/**
 * @swagger
 * /hosts/{id}/maintenance:
 *   patch:
 *     summary: Toggle host maintenance mode
 *     tags: [Hosts]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated host object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Host not found
 */
router.patch('/hosts/:id/maintenance', requireApiKey, (req, res) => {
  const h = hosts.toggleMaintenance(req.params.id);
  h ? res.json(h) : res.status(404).json({ error: 'Host not found' });
});

// ─── Docker containers ───────────────────────────────────────
/**
 * @swagger
 * /containers:
 *   get:
 *     summary: Docker containers
 *     tags: [Containers]
 *     responses:
 *       200:
 *         description: Array of Docker container objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
// TODO: auth on reads
router.get('/containers', async (_req, res) => {
  try {
    res.json(await metrics.getContainers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Agent registration ──────────────────────────────────────
/**
 * @swagger
 * /agents/register:
 *   post:
 *     summary: Register a remote agent
 *     tags: [Agents]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agent registered successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Host not found in inventory
 */
router.post('/agents/register', requireAgentToken, (req, res) => {
  const updated = hosts.updateHost(req.body.id, req.body);
  updated
    ? res.json({ success: true, host: updated })
    : res.status(404).json({ error: 'Host not found — add to inventory first' });
});

/**
 * @swagger
 * /agents/push:
 *   post:
 *     summary: Push metrics from a remote agent
 *     tags: [Agents]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hostId:
 *                 type: string
 *               metrics:
 *                 type: object
 *     responses:
 *       200:
 *         description: Metrics received
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */
router.post(
  '/agents/push',
  agentPushLimiter,
  requireAgentToken,
  validateBody(agentPushSchema),
  (req, res) => {
    // Support both nested ({ hostId, metrics }) and flat ({ id, cpu, ram, ... }) shapes
    const body = req.body;
    const id = body.hostId ?? body.id;
    const m  = body.metrics ?? body;
    const updated = hosts.updateHost(id, m);
    res.json({ received: true, host: updated?.hostname ?? 'unknown' });
  }
);

module.exports = router;
