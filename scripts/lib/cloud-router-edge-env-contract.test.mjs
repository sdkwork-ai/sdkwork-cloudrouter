import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLOUD_ROUTER_EDGE_ENV_KEYS,
  buildReleaseHostEdgeGeneratedEnv,
  buildRuntimeEdgePrivateEnv,
  pickCanonicalEdgeEnv,
  resolveEdgeEnvValue,
  sanitizeReleaseHostEnvRecord,
} from './cloud-router-edge-env-contract.mjs';

test('resolveEdgeEnvValue prefers canonical keys over legacy aliases', () => {
  const env = {
    [CLOUD_ROUTER_EDGE_ENV_KEYS.cspConnectSrc]: 'https://canonical.example.com',
    PORTAL_CSP_CONNECT_SRC: 'https://legacy.example.com',
  };
  assert.equal(
    resolveEdgeEnvValue(env, CLOUD_ROUTER_EDGE_ENV_KEYS.cspConnectSrc),
    'https://canonical.example.com',
  );
});

test('resolveEdgeEnvValue reads legacy aliases when canonical key is absent', () => {
  const env = {
    PORTAL_TOOL_API_RATE_LIMIT_REQUESTS: '240',
  };
  assert.equal(
    resolveEdgeEnvValue(env, CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests),
    '240',
  );
});

test('pickCanonicalEdgeEnv emits only defined canonical keys', () => {
  const env = {
    PORTAL_TOOL_API_SDK_ARCHIVE_ROOT: '/tmp/archives',
    PORTAL_PUBLIC_TOOL_API_ENABLED: 'false',
  };
  assert.deepEqual(pickCanonicalEdgeEnv(env), {
    [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot]: '/tmp/archives',
  });
});

test('sanitizeReleaseHostEnvRecord migrates legacy edge keys to canonical names', () => {
  const sanitized = sanitizeReleaseHostEnvRecord({
    SDKWORK_ACCESS_TOKEN: 'test-only-input-token',
    SDKWORK_DATABASE_URL: 'postgres://process-override-must-not-be-persisted',
    PORTAL_TOOL_API_RATE_LIMIT_REQUESTS: '240',
    PORTAL_CSP_CONNECT_SRC: 'https://legacy.example.com',
    PORTAL_PUBLIC_TOOL_API_ENABLED: 'false',
  });
  assert.equal(sanitized.SDKWORK_CLOUDROUTER_TOOL_API_RATE_LIMIT_REQUESTS, '240');
  assert.equal(sanitized.SDKWORK_CLOUDROUTER_EDGE_CSP_CONNECT_SRC, 'https://legacy.example.com');
  assert.equal(sanitized.PORTAL_PUBLIC_TOOL_API_ENABLED, 'false');
  assert.equal(sanitized.PORTAL_TOOL_API_RATE_LIMIT_REQUESTS, undefined);
  assert.equal(sanitized.PORTAL_CSP_CONNECT_SRC, undefined);
  assert.equal(Object.hasOwn(sanitized, 'SDKWORK_ACCESS_TOKEN'), false);
  assert.equal(Object.hasOwn(sanitized, 'SDKWORK_DATABASE_URL'), false);
});

test('buildReleaseHostEdgeGeneratedEnv emits canonical defaults', () => {
  assert.deepEqual(buildReleaseHostEdgeGeneratedEnv({}), {
    SDKWORK_CLOUDROUTER_EDGE_CSP_CONNECT_SRC: '',
    SDKWORK_CLOUDROUTER_TOOL_API_RATE_LIMIT_REQUESTS: '120',
    SDKWORK_CLOUDROUTER_TOOL_API_RATE_LIMIT_WINDOW_SECONDS: '60',
    SDKWORK_CLOUDROUTER_TOOL_API_SDK_GENERATOR_BASE_URL: '',
    SDKWORK_CLOUDROUTER_TOOL_API_SDK_GENERATOR_API_KEY: '',
    SDKWORK_CLOUDROUTER_TOOL_API_SDK_ARCHIVE_ROOT: '',
  });
});

test('buildRuntimeEdgePrivateEnv applies overrides on top of generated defaults', () => {
  assert.deepEqual(
    buildRuntimeEdgePrivateEnv({}, {
      [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot]: '/tmp/archives',
    }),
    {
      ...buildReleaseHostEdgeGeneratedEnv({}),
      [CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot]: '/tmp/archives',
    },
  );
});

test('resolveEdgeEnvValue applies fallback when neither canonical nor legacy is set', () => {
  assert.equal(
    resolveEdgeEnvValue({}, CLOUD_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests, '120'),
    '120',
  );
});
