/**
 * services/hosts.js
 * Host/device inventory. In a real deployment, hosts register
 * via the agent endpoint and update their metrics on push.
 */

const hosts = [
  {
    id: 'h1', hostname: 'srv-master',   ip: '10.0.0.1',
    os: 'Ubuntu', osVersion: '22.04 LTS', kernel: '5.15.0-100-generic',
    status: 'online', role: 'master', location: 'DC-Berlin-01',
    cpu: 0, ram: 0, disk: 74, services: 6,
    sslExpiry: '2025-09-14', backupStatus: 'ok', maintenanceMode: false,
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'h2', hostname: 'srv-node-01',  ip: '10.0.0.2',
    os: 'Ubuntu', osVersion: '22.04 LTS', kernel: '5.15.0-100-generic',
    status: 'online', role: 'worker', location: 'DC-Berlin-01',
    cpu: 0, ram: 0, disk: 61, services: 3,
    sslExpiry: '2025-09-14', backupStatus: 'ok', maintenanceMode: false,
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'h3', hostname: 'srv-node-02',  ip: '10.0.0.3',
    os: 'Ubuntu', osVersion: '22.04 LTS', kernel: '5.15.0-100-generic',
    status: 'online', role: 'worker', location: 'DC-Berlin-01',
    cpu: 0, ram: 0, disk: 55, services: 3,
    sslExpiry: '2025-09-14', backupStatus: 'warning', maintenanceMode: false,
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'h4', hostname: 'srv-db-01',    ip: '10.0.0.10',
    os: 'Debian', osVersion: '12 Bookworm', kernel: '6.1.0-21-amd64',
    status: 'online', role: 'db', location: 'DC-Berlin-02',
    cpu: 0, ram: 0, disk: 68, services: 2,
    sslExpiry: '2025-11-30', backupStatus: 'running', maintenanceMode: false,
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'h5', hostname: 'srv-gateway',  ip: '10.0.0.20',
    os: 'Alpine Linux', osVersion: '3.19', kernel: '6.6.22-0-lts',
    status: 'online', role: 'gateway', location: 'DC-Frankfurt-01',
    cpu: 0, ram: 0, disk: 32, services: 2,
    sslExpiry: '2025-08-01', backupStatus: 'ok', maintenanceMode: false,
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'h6', hostname: 'srv-backup',   ip: '10.0.0.30',
    os: 'Debian', osVersion: '12 Bookworm', kernel: '6.1.0-21-amd64',
    status: 'maintenance', role: 'backup', location: 'DC-Hamburg-01',
    cpu: 0, ram: 0, disk: 81, services: 0,
    sslExpiry: null, backupStatus: 'failed', maintenanceMode: true,
    lastSeen: new Date(Date.now() - 3_600_000).toISOString(),
  },
];

// Simulate live resource fluctuation for non-maintenance hosts
function getLiveHosts() {
  return hosts.map(h => {
    if (h.status === 'maintenance' || h.status === 'offline') return h;
    return {
      ...h,
      cpu: Math.floor(Math.random() * 65 + 10),
      ram: Math.floor(Math.random() * 50 + 30),
      lastSeen: new Date().toISOString(),
    };
  });
}

// Agent registration — called when a remote agent pushes data
function updateHost(id, data) {
  const idx = hosts.findIndex(h => h.id === id || h.hostname === data.hostname);
  if (idx >= 0) {
    hosts[idx] = { ...hosts[idx], ...data, lastSeen: new Date().toISOString() };
    return hosts[idx];
  }
  return null;
}

function toggleMaintenance(id) {
  const h = hosts.find(h => h.id === id);
  if (h) { h.maintenanceMode = !h.maintenanceMode; h.status = h.maintenanceMode ? 'maintenance' : 'online'; }
  return h;
}

module.exports = { getLiveHosts, updateHost, toggleMaintenance };
