import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname, '..');

test('clawrouter-app-sdk family layout is materialized', () => {
  assert.equal(existsSync(path.join(workspaceRoot, 'clawrouter-app-sdk-typescript', 'generated', 'server-openapi', 'package.json')), true);
  assert.equal(existsSync(path.join(workspaceRoot, 'openapi', 'clawrouter-app-sdk.openapi.json')), true);
  assert.equal(existsSync(path.join(workspaceRoot, '.sdkwork-assembly.json')), true);
});
