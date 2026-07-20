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

test('successful startup prints local access and every LAN URL on standalone lines', () => {
  const settings = parseWorkspaceArgs([]);
  assert.deepEqual(successfulStartupAccessLines(settings, networkInterfaces), [
    '[start-workspace] application started successfully',
    '[start-workspace] Access URLs',
    '[start-workspace]   Local: http://127.0.0.1:3900/',
    '[start-workspace]   Network: http://10.0.0.7:3900/',
    '[start-workspace]   Network: http://169.254.23.73:3900/',
    '[start-workspace]   Network: http://192.168.50.12:3900/',
    '[start-workspace]   Network: http://198.18.0.1:3900/',
  ]);
});

test('workspace access reuses shared network formatting without local duplication', () => {
  const lines = workspaceAccessLines(parseWorkspaceArgs([]), true, networkInterfaces);
  assert.ok(lines.includes('[start-workspace] LAN Access (same Wi-Fi/LAN)'));
  assert.equal(
    lines.filter((line) => line === '[start-workspace]   Network: http://198.18.0.1:3900/').length,
    1,
  );
  assert.equal(lines.some((line) => line.includes('127.0.0.1:3900/') && line.includes('Network:')), false);
  assert.equal(lines.some((line) => line.includes('fe80::1')), false);
});

test('loopback-only startup does not advertise a LAN URL', () => {
  const settings = parseWorkspaceArgs(['--server-bind', '127.0.0.1:3900']);
  assert.deepEqual(successfulStartupAccessLines(settings, networkInterfaces).slice(-2), [
    '[start-workspace]   Local: http://127.0.0.1:3900/',
    '[start-workspace]   Network: unavailable (listener is loopback-only or no LAN IPv4 address was detected)',
  ]);
});
