import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS,
  assertEnvTemplateFreeOfForbiddenBrowserProfileKeys,
  findForbiddenEnvKeysInContent,
  migrateLegacyBrowserDevelopmentEnvRecord,
  sanitizeBrowserProductionEnvRecord,
} from './cloud-router-browser-env-contract.mjs';

test('findForbiddenEnvKeysInContent detects legacy PORTAL keys', () => {
  const matches = findForbiddenEnvKeysInContent([
    '# comment',
    'VITE_API_BASE_URL=/v1',
    'PORTAL_PUBLIC_API_BASE_URL=/v1',
    'PORTAL_DEV_PROXY_GATEWAY_TARGET=http://127.0.0.1:3900',
    'PORTAL_FORWARD_GATEWAY_BASE_URL=http://127.0.0.1:3900',
  ].join('\n'));

  assert.deepEqual(
    matches.map((entry) => entry.key),
    [
      'PORTAL_PUBLIC_API_BASE_URL',
      'PORTAL_DEV_PROXY_GATEWAY_TARGET',
      'PORTAL_FORWARD_GATEWAY_BASE_URL',
    ],
  );
});

test('assertEnvTemplateFreeOfForbiddenBrowserProfileKeys rejects legacy keys', () => {
  assert.throws(
    () => assertEnvTemplateFreeOfForbiddenBrowserProfileKeys('PORTAL_PUBLIC_API_BASE_URL=/v1\n', {
      profileLabel: 'sample template',
    }),
    /legacy PORTAL_\*/u,
  );
});

test('sanitizeBrowserProductionEnvRecord strips all legacy PORTAL keys', () => {
  const sanitized = sanitizeBrowserProductionEnvRecord({
    SDKWORK_ACCESS_TOKEN: 'token',
    SDKWORK_CLOUDROUTER_CONFIG_PROFILE: 'prod',
    SDKWORK_CLOUDROUTER_ENVIRONMENT: 'production',
    SDKWORK_CLOUDROUTER_DEPLOYMENT_PROFILE: 'standalone',
    SDKWORK_CLOUDROUTER_RUNTIME_TARGET: 'browser',
    PORTAL_PUBLIC_API_BASE_URL: '/v1',
    PORTAL_DEV_PROXY_GATEWAY_TARGET: 'http://127.0.0.1:3900',
    PORTAL_FORWARD_APP_API_BASE_URL: 'http://127.0.0.1:3900',
    [CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi]: 'http://127.0.0.1:3900',
  });

  assert.equal(Object.hasOwn(sanitized, 'SDKWORK_ACCESS_TOKEN'), false);
  assert.equal(sanitized.PORTAL_PUBLIC_API_BASE_URL, undefined);
  assert.equal(sanitized.PORTAL_DEV_PROXY_GATEWAY_TARGET, undefined);
  assert.equal(sanitized.PORTAL_FORWARD_APP_API_BASE_URL, undefined);
  assert.equal(sanitized[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi], 'http://127.0.0.1:3900');
  assert.equal(sanitized.SDKWORK_CLOUDROUTER_CONFIG_PROFILE, undefined);
  assert.equal(sanitized.SDKWORK_CLOUDROUTER_ENVIRONMENT, undefined);
  assert.equal(sanitized.SDKWORK_CLOUDROUTER_DEPLOYMENT_PROFILE, undefined);
  assert.equal(sanitized.SDKWORK_CLOUDROUTER_RUNTIME_TARGET, undefined);
});

test('migrateLegacyBrowserDevelopmentEnvRecord maps legacy proxy and public keys', () => {
  const migrated = migrateLegacyBrowserDevelopmentEnvRecord({
    PORTAL_DEV_PROXY_BACKEND_API_TARGET: 'http://127.0.0.1:18081',
    PORTAL_PUBLIC_TOOL_API_ENABLED: 'true',
  });

  assert.equal(
    migrated[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi],
    'http://127.0.0.1:18081',
  );
  assert.equal(migrated.VITE_TOOL_API_ENABLED, 'true');
  assert.equal(migrated.PORTAL_PUBLIC_TOOL_API_ENABLED, undefined);
});
