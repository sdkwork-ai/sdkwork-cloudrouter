import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  assertEntrypointMarkers,
  assertRuntimeEnvScriptDoesNotExposeAccessToken,
  assertTemplateAccessTokenLifecycleBoundaries,
  assertViteDevelopmentOnlyBootstrapToken,
} from '../check-cloud-router-application-env.mjs';
import { ensureCloudRouterEnvForLifecycle } from './cloud-router-application-env.mjs';

test('ensureCloudRouterEnvForLifecycle start resolves release and production profiles', () => {
  const results = ensureCloudRouterEnvForLifecycle('start', {
    workspaceRoot: path.resolve(import.meta.dirname, '..', '..'),
    dryRun: true,
  });

  assert.ok(results.release);
  assert.ok(results.production);
  assert.equal(Object.hasOwn(results.release.mergedEnv, 'SDKWORK_ACCESS_TOKEN'), false);
  assert.equal(Object.hasOwn(results.production.mergedEnv, 'SDKWORK_ACCESS_TOKEN'), false);
});

test('ensureCloudRouterEnvForLifecycle all never invokes development token signing', () => {
  const results = ensureCloudRouterEnvForLifecycle('all', {
    workspaceRoot: path.resolve(import.meta.dirname, '..', '..'),
    dryRun: true,
    env: {
      SDKWORK_CLOUDROUTER_APP_SESSION_SECRET: 'too-short',
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

test('ensure-cloud-router-env script exposes lifecycle help', () => {
  const source = readFileSync(
    path.join(import.meta.dirname, '..', 'ensure-cloud-router-env.mjs'),
    'utf8',
  );
  assert.match(source, /--lifecycle/u);
  assert.match(source, /ensureCloudRouterEnvForLifecycle/u);
});
