import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname, '..');

test('cloudrouter-backend-sdk family layout is materialized', () => {
  assert.equal(existsSync(path.join(workspaceRoot, 'cloudrouter-backend-sdk-typescript', 'generated', 'server-openapi', 'package.json')), true);
  assert.equal(existsSync(path.join(workspaceRoot, 'openapi', 'cloudrouter-backend-sdk.openapi.json')), true);
  assert.equal(existsSync(path.join(workspaceRoot, 'sdk-manifest.json')), true);
});
