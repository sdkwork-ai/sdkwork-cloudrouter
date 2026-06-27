import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  assertEntrypointMarkers,
  assertRuntimeEnvScriptDoesNotExposeAccessToken,
  assertTemplateDocumentsAccessToken,
  assertViteDevelopmentOnlyBootstrapToken,
  REQUIRED_TEMPLATE_FILES,
} from '../check-claw-router-application-env.mjs';
import { ensureClawRouterEnvForLifecycle } from './claw-router-application-env.mjs';

test('ensureClawRouterEnvForLifecycle start resolves release and production profiles', () => {
  const results = ensureClawRouterEnvForLifecycle('start', {
    workspaceRoot: path.resolve(import.meta.dirname, '..', '..'),
    dryRun: true,
  });

  assert.ok(results.release);
  assert.ok(results.production);
  assert.match(results.release.mergedEnv.SDKWORK_ACCESS_TOKEN ?? '', /^v2\./u);
  assert.equal(results.production.mergedEnv.SDKWORK_ACCESS_TOKEN ?? '', '');
});

test('application env templates document SDKWORK_ACCESS_TOKEN without live values', () => {
  for (const templatePath of REQUIRED_TEMPLATE_FILES) {
    assert.doesNotThrow(() => assertTemplateDocumentsAccessToken(templatePath));
  }
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
