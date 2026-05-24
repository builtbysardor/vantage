/**
 * validators/index.js
 * Zod schemas + a small Express middleware factory.
 *
 * - agentPushSchema: validates POST /api/agents/push body.
 *   The remote agent currently sends a flat payload that includes `id`,
 *   `hostname`, and metric fields (cpu/ram/disk/uptime). The spec asks
 *   us to validate `{ hostId, metrics: { cpu, ram, disk, uptime? } }`.
 *   We accept either shape so existing agent behavior is preserved.
 * - alertIdParamSchema: ensures :id is a non-empty string.
 */

'use strict';

const { z } = require('zod');

const percent = z.number().min(0).max(100);

const metricsObject = z.object({
  cpu: percent,
  ram: percent,
  disk: percent,
  uptime: z.number().nonnegative().optional(),
});

// Nested shape per spec
const nestedShape = z.object({
  hostId: z.string().min(1),
  metrics: metricsObject,
});

// Flat shape matching what the existing agent sends
const flatShape = z.object({
  id: z.string().min(1),
  hostname: z.string().optional(),
  os: z.string().optional(),
  cpu: percent,
  ram: percent,
  disk: percent,
  uptime: z.number().nonnegative().optional(),
  timestamp: z.string().optional(),
}).passthrough();

const agentPushSchema = z.union([nestedShape, flatShape]);

const alertIdParamSchema = z.object({
  id: z.string().min(1),
});

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: result.error.issues,
      });
    }
    req.body = result.data;
    return next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid path parameters',
        details: result.error.issues,
      });
    }
    return next();
  };
}

module.exports = {
  agentPushSchema,
  alertIdParamSchema,
  validateBody,
  validateParams,
};
