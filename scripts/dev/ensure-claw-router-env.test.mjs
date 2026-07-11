import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  assertEntrypointMarkers,
  assertRuntimeEnvScriptDoesNotExposeAccessToken,
  assertTemplateAccessTokenLifecycleBoundaries,
  assertViteDevelopmentOnlyBootstrapToken,
} from '../check-claw-router-application-env.mjs';
import { ensureClawRouterEnvForLifecycle } from './claw-router-application-env.mjs';

test('ensureClawRouterEnvForLifecycle start resolves release and production profiles', () => {
  const results = ensureClawRouterEnvForLifecycle('start', {
    workspaceRoot: path.resolve(import.meta.dirname, '..', '..'),
    dryRun: true,
  });

  assert.ok(results.release);
  assert.ok(results.production);
  assert.equal(Object.hasOwn(results.release.mergedEnv, 'SDKWORK_ACCESS_TOKEN'), false);
  assert.equal(Object.hasOwn(results.production.mergedEnv, 'SDKWORK_ACCESS_TOKEN'), false);
});

test('ensureClawRouterEnvForLifecycle all never invokes development token signing', () => {
  const results = ensureClawRouterEnvForLifecycle('all', {
    workspaceRoot: path.resolve(import.meta.dirname, '..', '..'),
    dryRun: true,
    env: {
      SDKWORK_CLAW_APP_SESSION_SECRET: 'too-short',
    },
  });

  assert.equal(Object.hasOwn(results, 'development'), false);
  assert.ok(results.release);
  assert.ok(results.production);
});

test('application env templates limit SDKWORK_ACCESS_TOKEN to development', () => {
  assert.doesNotThrow(assertTemplateAccessTokenLifecycleBoundaries);
});

test('vite config gates bootstrap access token to development mode only', () => {
  assert.doesNotThrow(assertViteDevelopmentOnlyBootstrapToken);
  assert.doesNotThrow(assertRuntimeEnvScriptDoesNotExposeAccessToken);
});

test('startup and build entrypoints ensure application env profiles', () => {
  assert.doesNotThrow(assertEntrypointMarkers);
});

test('ensure-claw-router-env script exposes lifecycle help', () => {
  const source = readFileSync(
    path.join(import.meta.dirname, '..', 'ensure-claw-router-env.mjs'),
    'utf8',
  );
  assert.match(source, /--lifecycle/u);
  assert.match(source, /ensureClawRouterEnvForLifecycle/u);
});
