import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname, '..');

test('clawrouter-backend-sdk family layout is materialized', () => {
  assert.equal(existsSync(path.join(workspaceRoot, 'clawrouter-backend-sdk-typescript', 'generated', 'server-openapi', 'package.json')), true);
  assert.equal(existsSync(path.join(workspaceRoot, 'openapi', 'clawrouter-backend-sdk.openapi.json')), true);
  assert.equal(existsSync(path.join(workspaceRoot, '.sdkwork-assembly.json')), true);
});
