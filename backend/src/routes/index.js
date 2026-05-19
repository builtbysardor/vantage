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
const { requireApiKey, requireAgentToken } = require('../middleware/auth');
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

// ─── Health ──────────────────────────────────────────────────
// TODO: auth on reads
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// ─── Full snapshot (dashboard overview) ──────────────────────
// TODO: auth on reads
router.get('/metrics', async (_req, res) => {
  try {
    const snapshot = await metrics.getFullSnapshot();
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TODO: auth on reads
router.get('/metrics/history', (_req, res) => {
  res.json(metrics.history);
});

// TODO: auth on reads
router.get('/system', async (_req, res) => {
  try {
    res.json(await metrics.getSystemInfo());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TODO: auth on reads
router.get('/network', async (_req, res) => {
  try {
    res.json(await metrics.getNetworkMetrics());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Services ────────────────────────────────────────────────
// TODO: auth on reads
router.get('/services', async (_req, res) => {
  try {
    res.json(await svc.getServices());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
// TODO: auth on reads
router.get('/alerts', (req, res) => {
  res.json(alerts.getAlerts(req.query));
});

router.patch(
  '/alerts/:id/acknowledge',
  requireApiKey,
  validateParams(alertIdParamSchema),
  (req, res) => {
    const a = alerts.acknowledge(req.params.id, req.body.user || 'admin');
    a ? res.json(a) : res.status(404).json({ error: 'Alert not found' });
  }
);

router.patch(
  '/alerts/:id/resolve',
  requireApiKey,
  validateParams(alertIdParamSchema),
  (req, res) => {
    const a = alerts.resolve(req.params.id);
    a ? res.json(a) : res.status(404).json({ error: 'Alert not found' });
  }
);

// TODO: auth on reads
router.get('/alerts/thresholds', (_req, res) => {
  res.json(alerts.THRESHOLDS);
});

// ─── Logs ────────────────────────────────────────────────────
// TODO: auth on reads
router.get('/logs', (req, res) => {
  const { level, source, host, limit } = req.query;
  res.json(logs.getLogs({ level, source, host, limit: parseInt(limit) || 100 }));
});

// ─── Hosts ───────────────────────────────────────────────────
// TODO: auth on reads
router.get('/hosts', (_req, res) => {
  res.json(hosts.getLiveHosts());
});

router.patch('/hosts/:id/maintenance', requireApiKey, (req, res) => {
  const h = hosts.toggleMaintenance(req.params.id);
  h ? res.json(h) : res.status(404).json({ error: 'Host not found' });
});

// ─── Docker containers ───────────────────────────────────────
// TODO: auth on reads
router.get('/containers', async (_req, res) => {
  try {
    res.json(await metrics.getContainers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Agent registration ──────────────────────────────────────
router.post('/agents/register', requireAgentToken, (req, res) => {
  const updated = hosts.updateHost(req.body.id, req.body);
  updated
    ? res.json({ success: true, host: updated })
    : res.status(404).json({ error: 'Host not found — add to inventory first' });
});

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
