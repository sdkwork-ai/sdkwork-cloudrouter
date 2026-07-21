import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseWorkspaceArgs,
  successfulStartupAccessLines,
  workspaceAccessLines,
} from './dev/start-workspace.mjs';

const networkInterfaces = {
  Ethernet: [
    { family: 'IPv4', address: '198.18.0.1', internal: false },
    { family: 'IPv4', address: '192.168.50.12', internal: false },
    { family: 'IPv4', address: '127.0.0.1', internal: true },
    { family: 'IPv6', address: 'fe80::1', internal: false },
  ],
  WiFi: [
    { family: 'IPv4', address: '10.0.0.7', internal: false },
    { family: 4, address: '169.254.23.73', internal: false },
  ],
  Virtual: [
    { family: 'IPv4', address: '198.18.0.1', internal: false },
  ],
};

test('successful startup prints the reachable loopback portal URL', () => {
  const settings = parseWorkspaceArgs([]);
  assert.deepEqual(successfulStartupAccessLines(settings, networkInterfaces), [
    '[start-workspace] application started successfully',
    '[start-workspace] Access URLs',
    '[start-workspace]   Local: http://127.0.0.1:3901/',
    '[start-workspace]   Network: unavailable (listener is loopback-only or no LAN IPv4 address was detected)',
  ]);
});

test('workspace access reuses shared network formatting without local duplication', () => {
  const lines = workspaceAccessLines(parseWorkspaceArgs([]), true, networkInterfaces);
  assert.ok(lines.includes('[start-workspace] Application API LAN OpenAPI (same Wi-Fi/LAN)'));
  assert.equal(
    lines.filter((line) => line === '[start-workspace]   Network: http://198.18.0.1:3900/openapi.json').length,
    1,
  );
  assert.equal(lines.some((line) => line.includes('127.0.0.1:3900/openapi.json') && line.includes('Network:')), false);
  assert.equal(lines.some((line) => line.includes('fe80::1')), false);
});

test('explicit public portal bind advertises the portal LAN URLs', () => {
  const settings = parseWorkspaceArgs(['--portal-bind', '0.0.0.0:13900']);
  assert.deepEqual(successfulStartupAccessLines(settings, networkInterfaces).slice(-5), [
    '[start-workspace]   Local: http://127.0.0.1:13900/',
    '[start-workspace]   Network: http://10.0.0.7:13900/',
    '[start-workspace]   Network: http://169.254.23.73:13900/',
    '[start-workspace]   Network: http://192.168.50.12:13900/',
    '[start-workspace]   Network: http://198.18.0.1:13900/',
  ]);
});
