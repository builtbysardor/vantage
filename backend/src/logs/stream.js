/**
 * logs/stream.js
 * In-memory log buffer with streaming and filtering support.
 * Pre-seeded with realistic IT operations log entries.
 */

const { v4: uuidv4 } = require('uuid');

const BUFFER_SIZE = 500;

const SEED_LOGS = [
  { level: 'OK',       source: 'nginx',       host: 'srv-master',  message: 'Worker process started (pid 1042). Ready to accept connections.' },
  { level: 'INFO',     source: 'postgresql',  host: 'srv-db-01',   message: 'Checkpoint complete: wrote 842 buffers (5.1%); 0 WAL file(s) added.' },
  { level: 'INFO',     source: 'redis',       host: 'srv-master',  message: 'Server initialized, ready to accept connections on port 6379.' },
  { level: 'WARN',     source: 'rabbitmq',    host: 'srv-master',  message: 'Queue depth exceeded 1000 messages on exchange "events.fanout".' },
  { level: 'ERROR',    source: 'mail-worker', host: 'srv-master',  message: 'SMTP connection refused on 10.0.0.11:2525 — retrying in 30s.' },
  { level: 'CRITICAL', source: 'mail-worker', host: 'srv-master',  message: 'Max retry attempts reached. Service entering failsafe shutdown.' },
  { level: 'INFO',     source: 'api-gateway', host: 'srv-gateway', message: 'Rate limiter activated for IP 192.168.1.104 (429 Too Many Requests).' },
  { level: 'WARN',     source: 'nginx',       host: 'srv-master',  message: 'Worker connections 768/1024 — approaching limit.' },
  { level: 'OK',       source: 'postgresql',  host: 'srv-db-01',   message: 'Autovacuum complete on table public.sessions (removed 14210 rows).' },
  { level: 'INFO',     source: 'system',      host: 'srv-master',  message: 'CPU temperature 68°C — within normal operating range.' },
  { level: 'WARN',     source: 'system',      host: 'srv-node-01', message: 'Disk /dev/sda1 at 74% — approaching warning threshold (80%).' },
  { level: 'ERROR',    source: 'rabbitmq',    host: 'srv-master',  message: 'Consumer acknowledgement timeout on queue "job.processor".' },
  { level: 'OK',       source: 'redis',       host: 'srv-master',  message: 'Background save completed — 2841 changes in 0.12 seconds.' },
  { level: 'INFO',     source: 'api-gateway', host: 'srv-gateway', message: 'Health check: all upstream targets responding normally.' },
  { level: 'WARN',     source: 'system',      host: 'srv-master',  message: 'Memory usage at 87% — recommend reviewing process allocation.' },
  { level: 'INFO',     source: 'nginx',       host: 'srv-master',  message: 'SSL certificate renewed — expires 2025-09-14.' },
  { level: 'ERROR',    source: 'postgresql',  host: 'srv-db-01',   message: 'Long-running query detected (>30s) from user app_service.' },
  { level: 'OK',       source: 'system',      host: 'srv-node-02', message: 'Scheduled backup completed successfully — 12.4 GB archived.' },
];

// Seed with realistic timestamps spread over last 30 minutes
const logs = SEED_LOGS.map((l, i) => ({
  id:        uuidv4(),
  timestamp: new Date(Date.now() - (SEED_LOGS.length - i) * 95_000).toISOString(),
  ...l,
})).reverse();

// ─── Live stream messages ────────────────────────────────────
const STREAM_POOL = [
  { level: 'INFO',  source: 'nginx',       message: 'GET /api/health 200 OK — 4ms' },
  { level: 'OK',    source: 'redis',       message: 'PING — PONG (0.3ms)' },
  { level: 'INFO',  source: 'postgresql',  message: 'Connection pool: 12/50 active connections' },
  { level: 'WARN',  source: 'rabbitmq',    message: 'Heartbeat missed from consumer #18' },
  { level: 'ERROR', source: 'mail-worker', message: 'Failed to deliver message ID 00471 — SMTP timeout' },
  { level: 'INFO',  source: 'api-gateway', message: 'Upstream health check OK — 3 targets' },
  { level: 'INFO',  source: 'system',      message: 'Load average: 1.24 1.31 1.29' },
  { level: 'OK',    source: 'postgresql',  message: 'WAL archiving complete — 0 files queued' },
  { level: 'WARN',  source: 'system',      message: 'Swap usage increased to 14%' },
  { level: 'INFO',  source: 'nginx',       message: 'Access log rotated — 48 MB archived' },
];

const HOSTS = ['srv-master', 'srv-node-01', 'srv-node-02', 'srv-db-01', 'srv-gateway'];

function addLog(entry) {
  const log = { id: uuidv4(), timestamp: new Date().toISOString(), ...entry };
  logs.unshift(log);
  if (logs.length > BUFFER_SIZE) logs.pop();
  return log;
}

function streamRandomLog() {
  const template = STREAM_POOL[Math.floor(Math.random() * STREAM_POOL.length)];
  return addLog({ ...template, host: HOSTS[Math.floor(Math.random() * HOSTS.length)] });
}

function getLogs({ level, source, host, limit = 100 } = {}) {
  let result = [...logs];
  if (level  && level  !== 'ALL') result = result.filter(l => l.level  === level);
  if (source && source !== 'ALL') result = result.filter(l => l.source === source);
  if (host   && host   !== 'ALL') result = result.filter(l => l.host   === host);
  return result.slice(0, Math.min(limit, 200));
}

module.exports = { addLog, streamRandomLog, getLogs };
