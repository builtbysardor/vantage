import type {
  SystemMetrics, Service, LogEntry, Alert,
  Host, NetworkInterface, ChartData, Settings
} from '@/types';

// ─── Helpers ────────────────────────────────────────────────
const rand = (min: number, max: number) =>
  Math.round(Math.random() * (max - min) + min);

const randFloat = (min: number, max: number) =>
  Math.round((Math.random() * (max - min) + min) * 10) / 10;

const ts = (offsetMs = 0) =>
  new Date(Date.now() - offsetMs).toISOString();

// ─── System Metrics ─────────────────────────────────────────
export function generateMetrics(): SystemMetrics {
  const cpu = rand(18, 94);
  return {
    cpu,
    ram: rand(42, 91),
    disk: rand(55, 78),
    network: { in: rand(10, 420), out: rand(5, 280) },
    uptime: 1_209_600 + rand(0, 86400), // ~14 days
    temperature: rand(48, 79),
    healthScore: cpu > 85 ? rand(50, 65) : rand(72, 97),
    timestamp: ts(),
  };
}

export function generateChartHistory(): ChartData {
  const points = 30;
  const cpu = Array.from({ length: points }, (_, i) => ({
    time: new Date(Date.now() - (points - i) * 60_000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    value: rand(15, 95),
  }));
  const ram = Array.from({ length: points }, (_, i) => ({
    time: new Date(Date.now() - (points - i) * 60_000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    value: rand(45, 88),
  }));
  const network = Array.from({ length: points }, (_, i) => ({
    time: new Date(Date.now() - (points - i) * 60_000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    in: rand(10, 380),
    out: rand(5, 240),
  }));
  return { cpu, ram, network };
}

// ─── Services ───────────────────────────────────────────────
export const SERVICES: Service[] = [
  { id: 'nginx',      name: 'nginx',       displayName: 'NGINX Web Server',    status: 'online',      latency: rand(4,18),   uptime: 99.97, healthScore: 98, port: 80,   pid: 1042,  restarts: 0, lastCheck: ts(12000),  version: '1.25.3',  description: 'Reverse proxy & load balancer' },
  { id: 'postgresql', name: 'postgresql',  displayName: 'PostgreSQL Database', status: 'online',      latency: rand(2,9),    uptime: 99.99, healthScore: 99, port: 5432, pid: 2218,  restarts: 0, lastCheck: ts(8000),   version: '16.2',    description: 'Primary relational database' },
  { id: 'redis',      name: 'redis',       displayName: 'Redis Cache',         status: 'online',      latency: rand(1,4),    uptime: 100.0, healthScore: 100,port: 6379, pid: 3301,  restarts: 0, lastCheck: ts(5000),   version: '7.2.4',   description: 'In-memory cache & session store' },
  { id: 'rabbitmq',   name: 'rabbitmq',    displayName: 'RabbitMQ',            status: 'degraded',    latency: rand(38,95),  uptime: 97.4,  healthScore: 61, port: 5672, pid: 4419,  restarts: 2, lastCheck: ts(22000),  version: '3.13.0',  description: 'Message queue broker' },
  { id: 'api-gw',     name: 'api-gateway', displayName: 'API Gateway',         status: 'online',      latency: rand(8,24),   uptime: 99.81, healthScore: 94, port: 8080, pid: 5502,  restarts: 1, lastCheck: ts(3000),   version: '2.4.1',   description: 'Central API entry point' },
  { id: 'mail',       name: 'mail-worker', displayName: 'Mail Worker',         status: 'offline',     latency: 0,            uptime: 81.2,  healthScore: 12, port: 2525, pid: undefined, restarts: 7, lastCheck: ts(180000), version: '1.2.0', description: 'Outbound email dispatcher' },
];

// ─── Logs ────────────────────────────────────────────────────
const LOG_MESSAGES: { level: LogEntry['level']; source: string; message: string }[] = [
  { level: 'OK',       source: 'nginx',      message: 'Worker process started successfully (pid 1042)' },
  { level: 'INFO',     source: 'postgresql', message: 'Checkpoint complete: wrote 842 buffers (5.1%); 0 WAL file(s) added' },
  { level: 'INFO',     source: 'redis',      message: 'Server initialized, ready to accept connections on port 6379' },
  { level: 'WARN',     source: 'rabbitmq',   message: 'Queue depth exceeded 1000 messages on exchange "events.fanout"' },
  { level: 'ERROR',    source: 'mail-worker',message: 'SMTP connection refused on 10.0.0.11:2525 — retrying in 30s' },
  { level: 'CRITICAL', source: 'mail-worker',message: 'Max retry attempts reached. Service entering failsafe shutdown.' },
  { level: 'INFO',     source: 'api-gateway',message: 'Rate limiter activated for IP 192.168.1.104 (429 Too Many Requests)' },
  { level: 'WARN',     source: 'nginx',      message: 'Worker connections 768/1024 — approaching limit' },
  { level: 'OK',       source: 'postgresql', message: 'Autovacuum complete on table public.sessions (removed 14210 rows)' },
  { level: 'INFO',     source: 'system',     message: 'CPU temperature: 68°C — within normal operating range' },
  { level: 'WARN',     source: 'system',     message: 'Disk /dev/sda1 at 74% — approaching warning threshold (80%)' },
  { level: 'ERROR',    source: 'rabbitmq',   message: 'Consumer acknowledgement timeout on queue "job.processor"' },
  { level: 'OK',       source: 'redis',      message: 'Background save completed — 2841 changes in 0.12 seconds' },
  { level: 'INFO',     source: 'api-gateway',message: 'Health check: all upstream targets responding normally' },
  { level: 'WARN',     source: 'system',     message: 'Memory usage at 87% — recommend reviewing process allocation' },
  { level: 'CRITICAL', source: 'system',     message: 'High CPU sustained above 92% for 5+ minutes on core 3' },
  { level: 'INFO',     source: 'nginx',      message: 'SSL certificate renewed successfully — expires 2025-09-14' },
  { level: 'ERROR',    source: 'postgresql', message: 'Long-running query detected (>30s) from user app_service' },
];

export function generateLogs(count = 80): LogEntry[] {
  const hosts = ['srv-master', 'srv-node-01', 'srv-node-02', 'srv-db-01'];
  return Array.from({ length: count }, (_, i) => {
    const template = LOG_MESSAGES[i % LOG_MESSAGES.length];
    return {
      id: `log-${Date.now()}-${i}`,
      ...template,
      host: hosts[i % hosts.length],
      timestamp: ts(i * rand(8000, 35000)),
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ─── Alerts ─────────────────────────────────────────────────
export const ALERTS: Alert[] = [
  { id:'a1', title:'Mail Worker Service Down',      message:'mail-worker has been unreachable for 3 minutes. 7 restart attempts failed. Manual intervention required.', severity:'critical', status:'active',       source:'mail-worker', host:'srv-master',   createdAt:ts(360000),  updatedAt:ts(60000)  },
  { id:'a2', title:'RabbitMQ Queue Depth High',     message:'Queue "events.fanout" depth: 4218 messages. Consumer throughput below threshold.',                           severity:'high',     status:'active',       source:'rabbitmq',    host:'srv-master',   createdAt:ts(720000),  updatedAt:ts(120000) },
  { id:'a3', title:'CPU Spike — srv-node-02',       message:'Core avg 91% sustained for 5 min. Possible runaway process.',                                                severity:'high',     status:'acknowledged', source:'system',      host:'srv-node-02',  createdAt:ts(900000),  updatedAt:ts(300000), acknowledgedBy:'admin' },
  { id:'a4', title:'Memory Usage Warning',          message:'RAM at 87% on srv-master. Recommend reviewing process allocation or scaling.',                               severity:'medium',   status:'active',       source:'system',      host:'srv-master',   createdAt:ts(1200000), updatedAt:ts(240000) },
  { id:'a5', title:'Disk Space Warning — /dev/sda1',message:'Disk usage at 74% — approaching 80% warning threshold.',                                                    severity:'medium',   status:'active',       source:'system',      host:'srv-node-01',  createdAt:ts(3600000), updatedAt:ts(600000) },
  { id:'a6', title:'PostgreSQL Slow Query',         message:'Query execution >30s detected. Possible missing index on table: sessions.',                                  severity:'low',      status:'acknowledged', source:'postgresql',  host:'srv-db-01',    createdAt:ts(7200000), updatedAt:ts(1800000), acknowledgedBy:'dba-user' },
  { id:'a7', title:'NGINX Worker Near Limit',       message:'Worker connections at 768/1024. May impact performance under load.',                                         severity:'low',      status:'resolved',     source:'nginx',       host:'srv-master',   createdAt:ts(14400000),updatedAt:ts(3600000) },
];

// ─── Hosts ───────────────────────────────────────────────────
export const HOSTS: Host[] = [
  { id:'h1', hostname:'srv-master',   ip:'10.0.0.1',  os:'Ubuntu',       osVersion:'22.04 LTS', status:'online',      lastSeen:ts(5000),    cpu:rand(30,80), ram:rand(50,87), disk:74, services:6, role:'master',  location:'DC-Berlin-01',  sslExpiry:'2025-09-14', backupStatus:'ok' },
  { id:'h2', hostname:'srv-node-01',  ip:'10.0.0.2',  os:'Ubuntu',       osVersion:'22.04 LTS', status:'online',      lastSeen:ts(8000),    cpu:rand(20,55), ram:rand(40,70), disk:61, services:3, role:'worker',  location:'DC-Berlin-01',  sslExpiry:'2025-09-14', backupStatus:'ok' },
  { id:'h3', hostname:'srv-node-02',  ip:'10.0.0.3',  os:'Ubuntu',       osVersion:'22.04 LTS', status:'online',      lastSeen:ts(10000),   cpu:rand(70,95), ram:rand(60,90), disk:55, services:3, role:'worker',  location:'DC-Berlin-01',  sslExpiry:'2025-09-14', backupStatus:'warning' },
  { id:'h4', hostname:'srv-db-01',    ip:'10.0.0.10', os:'Debian',       osVersion:'12 Bookworm',status:'online',     lastSeen:ts(6000),    cpu:rand(15,40), ram:rand(55,75), disk:68, services:2, role:'db',      location:'DC-Berlin-02',  sslExpiry:'2025-11-30', backupStatus:'running' },
  { id:'h5', hostname:'srv-gateway',  ip:'10.0.0.20', os:'Alpine Linux', osVersion:'3.19',      status:'online',      lastSeen:ts(4000),    cpu:rand(10,30), ram:rand(20,45), disk:32, services:2, role:'gateway', location:'DC-Frankfurt-01',sslExpiry:'2025-08-01', backupStatus:'ok' },
  { id:'h6', hostname:'srv-backup',   ip:'10.0.0.30', os:'Debian',       osVersion:'12 Bookworm',status:'maintenance',lastSeen:ts(3600000), cpu:0,           ram:0,           disk:81, services:0, role:'backup',  location:'DC-Hamburg-01',  sslExpiry:undefined,    backupStatus:'failed' },
];

// ─── Network Interfaces ──────────────────────────────────────
export const NETWORK_INTERFACES: NetworkInterface[] = [
  { id:'eth0', name:'eth0',  ip:'10.0.0.1',   status:'up',   speed:'1 Gbps',  bytesIn:4_823_041_024, bytesOut:2_109_872_640, packetsIn:3_241_018, packetsOut:2_018_774, latency:randFloat(0.4,1.2), errors:0 },
  { id:'eth1', name:'eth1',  ip:'10.0.0.2',   status:'up',   speed:'1 Gbps',  bytesIn:1_204_871_168, bytesOut:892_403_712,   packetsIn:1_002_481, packetsOut:841_290,   latency:randFloat(0.3,0.9), errors:2 },
  { id:'eth2', name:'eth2',  ip:'10.0.0.10',  status:'up',   speed:'10 Gbps', bytesIn:9_102_831_616, bytesOut:3_872_014_336, packetsIn:7_819_044, packetsOut:4_102_887, latency:randFloat(0.1,0.5), errors:0 },
  { id:'eth3', name:'eth3',  ip:'10.0.0.20',  status:'up',   speed:'1 Gbps',  bytesIn:612_041_728,   bytesOut:488_120_320,   packetsIn:512_840,   packetsOut:401_220,   latency:randFloat(0.5,1.8), errors:0 },
  { id:'eth4', name:'eth4',  ip:'10.0.0.30',  status:'down', speed:'1 Gbps',  bytesIn:0,             bytesOut:0,             packetsIn:0,         packetsOut:0,         latency:0,                  errors:0 },
];

// ─── Settings ────────────────────────────────────────────────
export const DEFAULT_SETTINGS: Settings = {
  refreshInterval: 10,
  thresholds: [
    { metric: 'CPU Usage',     warning: 80,  critical: 95,  unit: '%'  },
    { metric: 'RAM Usage',     warning: 85,  critical: 95,  unit: '%'  },
    { metric: 'Disk Usage',    warning: 80,  critical: 90,  unit: '%'  },
    { metric: 'DB Latency',    warning: 100, critical: 300, unit: 'ms' },
    { metric: 'CPU Temp',      warning: 75,  critical: 85,  unit: '°C' },
    { metric: 'Network In',    warning: 800, critical: 950, unit: 'Mbps'},
  ],
  notifications: {
    email: false,
    telegram: false,
    emailAddress: '',
    telegramChatId: '',
  },
  maintenanceMode: false,
};
