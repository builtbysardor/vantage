/**
 * lib/logger.js
 * Singleton pino logger instance for structured logging.
 */

'use strict';

const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'nexus-pro-backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
