import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseWorkspaceArgs,
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
