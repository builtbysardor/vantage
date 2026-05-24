/**
 * agents/agent.js
 * Lightweight monitoring agent.
 * Run this on any remote machine to push its metrics
 * to the central Nexus Pro backend.
 *
 * Usage:
 *   NEXUS_SERVER=http://10.0.0.1:3001 node agent.js
 */

const si     = require('systeminformation');
const http   = require('http');
const https  = require('https');
const os     = require('os');

const SERVER       = process.env.NEXUS_SERVER || 'http://localhost:3001';
const HOST_ID      = process.env.HOST_ID      || os.hostname();
const INTERVAL     = parseInt(process.env.INTERVAL || '10') * 1000;
const AGENT_TOKEN  = process.env.AGENT_TOKEN  || '';

if (!AGENT_TOKEN) {
  console.warn('[Agent] WARNING: AGENT_TOKEN env var is not set — pushes will be rejected by hardened backends');
}

console.log(`\n[Agent] Nexus Pro Monitoring Agent`);
console.log(`[Agent] Host:   ${HOST_ID}`);
console.log(`[Agent] Server: ${SERVER}`);
console.log(`[Agent] Push interval: ${INTERVAL / 1000}s\n`);

async function collectMetrics() {
  const [cpu, mem, disk, net, osInfo] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.osInfo(),
  ]);

  return {
    id:       HOST_ID,
    hostname: osInfo.hostname,
    os:       `${osInfo.distro} ${osInfo.release}`,
    cpu:      Math.round(cpu.currentLoad),
    ram:      Math.round((mem.active / mem.total) * 100),
    disk:     Math.round(disk[0]?.use ?? 0),
    uptime:   os.uptime(),
    timestamp: new Date().toISOString(),
  };
}

function push(data) {
  return new Promise((resolve, reject) => {
    const body    = JSON.stringify(data);
    const url     = new URL(`${SERVER}/api/agents/push`);
    const lib     = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(AGENT_TOKEN ? { 'x-agent-token': AGENT_TOKEN } : {}),
      },
    };
    const req = lib.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  try {
    const data = await collectMetrics();
    const res  = await push(data);
    console.log(`[Agent] Pushed — CPU: ${data.cpu}% RAM: ${data.ram}% Disk: ${data.disk}% → ${res.host}`);
  } catch (err) {
    console.error(`[Agent] Push failed: ${err.message}`);
  }
}

run(); // Push immediately on start
setInterval(run, INTERVAL);
