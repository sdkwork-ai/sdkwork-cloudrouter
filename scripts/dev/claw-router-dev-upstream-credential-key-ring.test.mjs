import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ensureClawRouterDevSecurityFiles } from './start-workspace.mjs';

const KEY_RING_ENV = 'SDKWORK_CLAW_UPSTREAM_CREDENTIAL_KEY_RING';
const KEY_RING_FILE_ENV = 'SDKWORK_CLAW_UPSTREAM_CREDENTIAL_KEY_RING_FILE';
const INTERNAL_GATEWAY_SECRET_ENV = 'SDKWORK_CLAW_INTERNAL_GATEWAY_SIGNING_SECRET';
const INTERNAL_GATEWAY_SECRET_FILE_ENV =
  'SDKWORK_CLAW_INTERNAL_GATEWAY_SIGNING_SECRET_FILE';

test('development startup creates and reuses private security files', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clawrouter-dev-key-ring-'));
  const deterministicKeys = [
    Buffer.alloc(32, 0x11),
    Buffer.alloc(32, 0x22),
    Buffer.alloc(32, 0x33),
  ];
  const first = ensureClawRouterDevSecurityFiles({
    workspaceRoot,
    env: {},
    randomBytesFn: () => deterministicKeys.shift(),
  });
  const keyRingFile = first[KEY_RING_FILE_ENV];
  const internalGatewaySecretFile = first[INTERNAL_GATEWAY_SECRET_FILE_ENV];
  const firstContent = fs.readFileSync(keyRingFile, 'utf8');
  const firstInternalGatewaySecret = fs.readFileSync(internalGatewaySecretFile, 'utf8');
  const keyRing = JSON.parse(firstContent);

  assert.equal(
    keyRingFile,
    path.join(
      workspaceRoot,
      '.sdkwork',
      'secrets',
      'upstream-credential-key-ring.development.json',
    ),
  );
  assert.equal(keyRing.activeKeyId, 'development-local-v1');
  assert.ok(Buffer.from(keyRing.activeKey, 'base64url').byteLength >= 32);
  assert.ok(Buffer.from(keyRing.fingerprintKey, 'base64url').byteLength >= 32);
  assert.notEqual(keyRing.activeKey, keyRing.fingerprintKey);
  assert.deepEqual(keyRing.decryptionKeys, []);
  assert.equal(
    internalGatewaySecretFile,
    path.join(
      workspaceRoot,
      '.sdkwork',
      'secrets',
      'internal-gateway-signing.development.secret',
    ),
  );
  assert.ok(
    Buffer.from(firstInternalGatewaySecret.trim(), 'base64url').byteLength >= 32,
  );

  const second = ensureClawRouterDevSecurityFiles({
    workspaceRoot,
    env: {},
    randomBytesFn: () => {
      throw new Error('existing key ring must not be rotated');
    },
  });
  assert.deepEqual(second, first);
  assert.equal(fs.readFileSync(keyRingFile, 'utf8'), firstContent);
  assert.equal(
    fs.readFileSync(internalGatewaySecretFile, 'utf8'),
    firstInternalGatewaySecret,
  );
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(keyRingFile).mode & 0o777, 0o600);
    assert.equal(fs.statSync(internalGatewaySecretFile).mode & 0o777, 0o600);
  }
});

test('explicit development security configuration takes precedence', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clawrouter-dev-key-ring-'));

  assert.deepEqual(
    ensureClawRouterDevSecurityFiles({
      workspaceRoot,
      env: {
        [KEY_RING_ENV]: '{"configured":true}',
        [INTERNAL_GATEWAY_SECRET_ENV]: 'configured-internal-gateway-secret',
      },
    }),
    {},
  );
  assert.equal(fs.existsSync(path.join(workspaceRoot, '.sdkwork', 'secrets')), false);
});

test('development dry-run resolves the secret path without writing it', () => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clawrouter-dev-key-ring-'));
  const result = ensureClawRouterDevSecurityFiles({
    workspaceRoot,
    env: {},
    dryRun: true,
  });

  assert.match(result[KEY_RING_FILE_ENV], /\.sdkwork[\\/]secrets[\\/]/u);
  assert.match(
    result[INTERNAL_GATEWAY_SECRET_FILE_ENV],
    /\.sdkwork[\\/]secrets[\\/]/u,
  );
  assert.equal(fs.existsSync(result[KEY_RING_FILE_ENV]), false);
  assert.equal(fs.existsSync(result[INTERNAL_GATEWAY_SECRET_FILE_ENV]), false);
});
