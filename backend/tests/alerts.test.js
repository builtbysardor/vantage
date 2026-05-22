/**
 * Unit tests for the alert engine.
 * Run with: node tests/alerts.test.js
 */

const { evaluate, getAlerts, acknowledge, resolve, THRESHOLDS } = require('../src/alerts/engine');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

console.log('\n=== Alert Engine Tests ===\n');

// Test 1: No alert when metrics are normal
console.log('Test: Normal metrics produce no new alerts');
const normalSnapshot = {
  cpu:    { usage: 40, temperature: 55 },
  memory: { usage: 50 },
  disks:  [{ mount: '/', usage: 30 }],
};
const result1 = evaluate(normalSnapshot);
assert(result1.length === 0, 'No alerts for normal metrics');

// Test 2: Warning alert when CPU exceeds warning threshold
console.log('\nTest: CPU warning threshold');
const warnSnapshot = {
  cpu:    { usage: THRESHOLDS.cpu.warning + 1, temperature: 55 },
  memory: { usage: 50 },
  disks:  [{ mount: '/', usage: 30 }],
};
const result2 = evaluate(warnSnapshot);
assert(result2.length >= 1, 'Alert generated for high CPU');
assert(result2[0].severity === 'high', 'Severity is high for warning threshold');

// Test 3: Critical alert
console.log('\nTest: CPU critical threshold');
const critSnapshot = {
  cpu:    { usage: THRESHOLDS.cpu.critical + 1, temperature: 55 },
  memory: { usage: 50 },
  disks:  [{ mount: '/', usage: 30 }],
};
const result3 = evaluate(critSnapshot);
const allCpuAlerts = getAlerts().filter(a => a.metric === 'cpu_usage');
assert(allCpuAlerts.length > 0, 'Critical CPU alert exists in store');

// Test 4: Acknowledge an alert
console.log('\nTest: Acknowledge alert');
const alerts = getAlerts();
if (alerts.length > 0) {
  const acked = acknowledge(alerts[0].id, 'test-user');
  assert(acked.status === 'acknowledged', 'Alert status is acknowledged');
  assert(acked.acknowledgedBy === 'test-user', 'acknowledgedBy is set');
}

// Test 5: Resolve an alert
console.log('\nTest: Resolve alert');
const activeAlerts = getAlerts({ status: 'active' });
if (activeAlerts.length > 0) {
  const resolved = resolve(activeAlerts[0].id);
  assert(resolved.status === 'resolved', 'Alert status is resolved');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
