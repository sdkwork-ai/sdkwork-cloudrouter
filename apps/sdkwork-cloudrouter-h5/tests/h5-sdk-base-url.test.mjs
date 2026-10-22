/**
 * H5 generated app SDK transport root (ENVIRONMENT_SPEC §6.3,
 * BROWSER_RUNTIME_ENV_SPEC §5.1/§5.2).
 *
 * The dev/standalone runtime document authors the same-origin RELATIVE prefix
 * `/app/v3/api`. Stripping the generated SDK's own prefix leaves the empty
 * transport root, which MUST stay empty (same-origin page). Passing it through
 * `resolveBaseUrl` as a candidate would be read as "no candidate", fall back to
 * deployment-mode derivation and fabricate sdk-common's cloud-gateway dev port
 * (`<host>:3910`) that the adaptive dev ingress never serves.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  loadRuntimeEnv,
  normalizeRuntimeEnv,
  resolveCloudRouterAppApiBaseUrl,
  resolveRuntimeEnv,
} from '../packages/sdkwork-cloudrouter-h5-core/src/sdk/runtimeEnv.ts';

function runtimeEnvFetch(document) {
  return async () => ({ ok: true, json: async () => document });
}

test('the loaded runtime document wins over build-time defaults and drives the bridge', async () => {
  // Before bootstrap only the build-time fallback exists (no Vite-inlined
  // document in a JSON surface).
  assert.equal(resolveRuntimeEnv().deploymentProfile, 'standalone');
  assert.equal(normalizeRuntimeEnv().deploymentProfile, 'standalone');

  const cloudDevDocument = {
    environment: 'development',
    deploymentProfile: 'cloud',
    profileId: 'cloud.development',
    browserOriginMode: 'same-origin',
    appApiBaseUrl: '/app/v3/api',
    backendApiBaseUrl: '/backend/v3/api',
    openApiBaseUrl: '/v1',
  };
  await loadRuntimeEnv(runtimeEnvFetch(cloudDevDocument));
  assert.equal(resolveRuntimeEnv().deploymentProfile, 'cloud');
  assert.equal(resolveRuntimeEnv().profileId, 'cloud.development');
  assert.equal(resolveCloudRouterAppApiBaseUrl(), '');
  // BROWSER_RUNTIME_ENV_SPEC §4: the loader publishes the document to the
  // canonical bridge before any SDK client is constructed.
  assert.equal(globalThis.SDKWORK_RUNTIME_ENV?.deploymentProfile, 'cloud');
  assert.equal(globalThis.SDKWORK_RUNTIME_ENV?.VITE_SDKWORK_DEPLOYMENT_PROFILE, 'cloud');
  // A cloud DEVELOPMENT document is same-origin (the dev ingress fronts the
  // canonical prefixes); only deployed cloud documents are cross-origin.
  assert.equal(globalThis.SDKWORK_RUNTIME_ENV?.browserOriginMode, 'same-origin');

  // A deployed cloud document resolves the absolute gateway family origin, not
  // the static page origin.
  await loadRuntimeEnv(runtimeEnvFetch({
    environment: 'production',
    deploymentProfile: 'cloud',
    profileId: 'cloud.production',
    browserOriginMode: 'cross-origin',
    appApiBaseUrl: 'https://api.sdkwork.com/app/v3/api',
    backendApiBaseUrl: 'https://api.sdkwork.com/backend/v3/api',
    openApiBaseUrl: 'https://api.sdkwork.com/v1',
  }));
  assert.equal(resolveCloudRouterAppApiBaseUrl(), 'https://api.sdkwork.com');
  assert.equal(globalThis.SDKWORK_RUNTIME_ENV?.browserOriginMode, 'cross-origin');
});

test('H5 SDK bootstrap never re-publishes build-time defaults over the loaded document', () => {
  // Regression guard: `publishRuntimeEnvGlobal(resolveRuntimeEnv())` in the SDK
  // bootstrap overwrote the loaded cloud document with the standalone defaults
  // (page-origin SDK base instead of the cloud API family).
  const source = readFileSync(
    new URL('../src/bootstrap/sdkClients.ts', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /publishRuntimeEnvGlobal\s*\(\s*resolveRuntimeEnv\s*\(/u);
  assert.match(source, /resolveCloudRouterAppApiBaseUrl\(\)/u);
});

test('dev documents resolve the app SDK transport root to same-origin', () => {
  for (const [deploymentProfile, profileId] of [
    ['cloud', 'cloud.development'],
    ['standalone', 'standalone.development'],
  ]) {
    const document = normalizeRuntimeEnv({
      environment: 'development',
      deploymentProfile,
      profileId,
      appApiBaseUrl: '/app/v3/api',
    });
    const resolved = resolveCloudRouterAppApiBaseUrl(document);
    assert.equal(resolved, '', profileId);
    assert.doesNotMatch(resolved, /3910|api-dev\.sdkwork\.com/u);
  }
});

test('deployed cloud documents keep the absolute family origin', () => {
  const document = normalizeRuntimeEnv({
    environment: 'production',
    deploymentProfile: 'cloud',
    profileId: 'cloud.production',
    appApiBaseUrl: 'https://api.sdkwork.com/app/v3/api',
  });
  assert.equal(resolveCloudRouterAppApiBaseUrl(document), 'https://api.sdkwork.com');
});

test('a root-relative mount path survives the transport-root reduction', () => {
  const document = normalizeRuntimeEnv({
    environment: 'production',
    deploymentProfile: 'standalone',
    profileId: 'standalone.production',
    appApiBaseUrl: '/tenant-a/app/v3/api',
  });
  assert.equal(resolveCloudRouterAppApiBaseUrl(document), '/tenant-a');
});
