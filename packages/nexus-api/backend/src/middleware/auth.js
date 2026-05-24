/**
 * middleware/auth.js
 * API key + agent token authentication middleware.
 *
 * - requireApiKey: validates `x-api-key` header against API_KEYS env (CSV).
 * - requireAgentToken: validates `x-agent-token` header against AGENT_TOKENS env (CSV).
 *
 * Both env vars are loaded lazily so tests / startup ordering don't break.
 */

'use strict';

const logger = require('../lib/logger');

function parseCsv(value) {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function requireApiKey(req, res, next) {
  const validKeys = parseCsv(process.env.API_KEYS);
  if (validKeys.length === 0) {
    logger.error('requireApiKey called but API_KEYS env is empty');
    return res.status(500).json({ error: 'Server auth misconfigured' });
  }
  const provided = req.header('x-api-key');
  if (!provided || !validKeys.includes(provided)) {
    logger.warn({ ip: req.ip, path: req.path }, 'Rejected request — invalid API key');
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  return next();
}

function requireAgentToken(req, res, next) {
  const validTokens = parseCsv(process.env.AGENT_TOKENS);
  if (validTokens.length === 0) {
    logger.error('requireAgentToken called but AGENT_TOKENS env is empty');
    return res.status(500).json({ error: 'Server auth misconfigured' });
  }
  const provided = req.header('x-agent-token');
  if (!provided || !validTokens.includes(provided)) {
    logger.warn({ ip: req.ip, path: req.path }, 'Rejected request — invalid agent token');
    return res.status(401).json({ error: 'Invalid or missing agent token' });
  }
  return next();
}

module.exports = { requireApiKey, requireAgentToken };
