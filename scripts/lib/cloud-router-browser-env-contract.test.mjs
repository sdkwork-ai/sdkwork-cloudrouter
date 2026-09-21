import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  alignStandaloneSameOriginBrowserSdkRuntimeEnv,
  assertBrowserDevRuntimeEnvDocument,
  authorBrowserDevelopmentSdkBaseUrls,
  buildBrowserDevRuntimeEnvDocument,
  CLOUD_ROUTER_BROWSER_DEVELOPMENT_DEFAULT_VITE_ENV,
  isLoopbackAbsoluteUrl,
  resolveCloudRouterBaseUrl,
  selectBaseUrlForPageHost,
  splitBaseUrls,
} from './cloud-router-browser-env-contract.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ALL_PROFILES = [
  'standalone.development',
  'standalone.test',
  'standalone.staging',
  'standalone.demo',
  'standalone.production',
  'cloud.development',
  'cloud.test',
  'cloud.staging',
  'cloud.demo',
  'cloud.production',
];

const CLOUD_PRIMARY_HOST_BY_ENVIRONMENT = Object.freeze({
  development: 'api-dev.sdkwork.com',
  test: 'api-test.sdkwork.com',
  staging: 'api-staging.sdkwork.com',
  demo: 'api-demo.sdkwork.com',
  production: 'api.sdkwork.com',
});

function parseTopologyEnv(profileId) {
  const values = {};
  for (const rawLine of fs
    .readFileSync(path.join(REPO, 'etc', 'topology', `${profileId}.env`), 'utf8')
    .split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return values;
}

function profileParts(profileId) {
  const [deploymentProfile, environment] = profileId.split('.');
  return { deploymentProfile, environment };
}

test('browser development defaults keep drive backend on same-origin backend prefix', () => {
  assert.equal(
    CLOUD_ROUTER_BROWSER_DEVELOPMENT_DEFAULT_VITE_ENV.VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL,
    '/backend/v3/api',
  );
});

test('alignStandaloneSameOriginBrowserSdkRuntimeEnv rewrites loopback dependency SDK URLs', () => {
  const aligned = alignStandaloneSameOriginBrowserSdkRuntimeEnv({
    VITE_CLOUDROUTER_APP_API_BASE_URL: '/app/v3/api',
    VITE_CLOUDROUTER_BACKEND_API_BASE_URL: '/backend/v3/api',
    VITE_SDKWORK_ACCOUNT_APP_API_BASE_URL: 'http://127.0.0.1:3902/app/v3/api',
    VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL: 'http://127.0.0.1:3900',
    VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL: 'http://127.0.0.1:3902/feeds/v3/api',
    VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL: 'http://127.0.0.1:3905',
  });

  assert.equal(aligned.VITE_SDKWORK_ACCOUNT_APP_API_BASE_URL, '/app/v3/api');
  assert.equal(aligned.VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL, '/backend/v3/api');
  assert.equal(aligned.VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL, '/feeds/v3/api');
  assert.equal(aligned.VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL, undefined);
});

test('alignStandaloneSameOriginBrowserSdkRuntimeEnv leaves release-style absolute URLs untouched', () => {
  const aligned = alignStandaloneSameOriginBrowserSdkRuntimeEnv({
    VITE_CLOUDROUTER_APP_API_BASE_URL: 'https://tenant.example.com/app/v3/api',
    VITE_SDKWORK_ACCOUNT_APP_API_BASE_URL: 'https://tenant.example.com/app/v3/api',
  });

  assert.equal(aligned.VITE_SDKWORK_ACCOUNT_APP_API_BASE_URL, 'https://tenant.example.com/app/v3/api');
});

test('alignStandaloneSameOriginBrowserSdkRuntimeEnv rewrites loopback canonical portal SDK URLs', () => {
  const aligned = alignStandaloneSameOriginBrowserSdkRuntimeEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: 'http://127.0.0.1:3902',
    VITE_API_BASE_URL: 'http://127.0.0.1:3902/v1',
    VITE_CLOUDROUTER_OPEN_API_BASE_URL: 'http://127.0.0.1:3902/v1',
    VITE_CLOUDROUTER_APP_API_BASE_URL: '/app/v3/api',
    VITE_CLOUDROUTER_BACKEND_API_BASE_URL: '/backend/v3/api',
  });

  assert.equal(aligned.VITE_API_BASE_URL, '/v1');
  assert.equal(aligned.VITE_CLOUDROUTER_OPEN_API_BASE_URL, '/v1');
});

test('isLoopbackAbsoluteUrl detects local dev origins', () => {
  assert.equal(isLoopbackAbsoluteUrl('http://127.0.0.1:3900'), true);
  assert.equal(isLoopbackAbsoluteUrl('https://tenant.example.com/app/v3/api'), false);
  assert.equal(isLoopbackAbsoluteUrl('/app/v3/api'), false);
});

test('alignment strips forbidden topology keys even when the canonical base keys are absent', () => {
  // Regression: the standalone.development materialized env carries no
  // VITE_CLOUDROUTER_APP_API_BASE_URL, so alignment used to early-return and
  // leak the process-only loopback `_HTTP_URL` bindings into the browser bag.
  const aligned = alignStandaloneSameOriginBrowserSdkRuntimeEnv({
    VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL: 'http://127.0.0.1:4734',
    VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_BACKEND_HTTP_URL: 'http://127.0.0.1:18081',
    VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_OPEN_HTTP_URL: 'http://127.0.0.1:18080',
    VITE_SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL: 'http://127.0.0.1:3900',
  });

  for (const forbiddenKey of [
    'VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL',
    'VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_BACKEND_HTTP_URL',
    'VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_OPEN_HTTP_URL',
    'VITE_SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL',
  ]) {
    assert.equal(aligned[forbiddenKey], undefined, forbiddenKey);
  }
});

test('authorBrowserDevelopmentSdkBaseUrls forces the canonical same-origin bases', () => {
  // Dev dotenv files are shared with `vite build` and legitimately carry
  // deploy-time domain values; the dev contract must OVERRIDE them.
  const authored = authorBrowserDevelopmentSdkBaseUrls({
    VITE_CLOUDROUTER_APP_API_BASE_URL: 'https://api-dev.sdkwork.com',
  });

  assert.equal(authored.VITE_CLOUDROUTER_APP_API_BASE_URL, '/app/v3/api');
  assert.equal(authored.VITE_CLOUDROUTER_BACKEND_API_BASE_URL, CLOUD_ROUTER_BROWSER_DEVELOPMENT_DEFAULT_VITE_ENV.VITE_CLOUDROUTER_BACKEND_API_BASE_URL);
  assert.equal(authored.VITE_CLOUDROUTER_OPEN_API_BASE_URL, CLOUD_ROUTER_BROWSER_DEVELOPMENT_DEFAULT_VITE_ENV.VITE_CLOUDROUTER_OPEN_API_BASE_URL);
  assert.equal(authored.VITE_API_BASE_URL, CLOUD_ROUTER_BROWSER_DEVELOPMENT_DEFAULT_VITE_ENV.VITE_API_BASE_URL);
});

test('buildBrowserDevRuntimeEnvDocument derives identity from the profile id', () => {
  assert.deepEqual(buildBrowserDevRuntimeEnvDocument({ profileId: 'cloud.development' }), {
    environment: 'development',
    deploymentProfile: 'cloud',
    profileId: 'cloud.development',
    browserOriginMode: 'same-origin',
    appApiBaseUrl: '/app/v3/api',
    backendApiBaseUrl: '/backend/v3/api',
    openApiBaseUrl: '/v1',
  });
  assert.deepEqual(buildBrowserDevRuntimeEnvDocument({ profileId: 'standalone.development' }), {
    environment: 'development',
    deploymentProfile: 'standalone',
    profileId: 'standalone.development',
    browserOriginMode: 'same-origin',
    appApiBaseUrl: '/app/v3/api',
    backendApiBaseUrl: '/backend/v3/api',
    openApiBaseUrl: '/v1',
  });
});

test('assertBrowserDevRuntimeEnvDocument accepts both profile documents and rejects violations', () => {
  for (const profileId of ['standalone.development', 'cloud.development']) {
    assertBrowserDevRuntimeEnvDocument(buildBrowserDevRuntimeEnvDocument({ profileId }), { profileId });
  }

  assert.throws(
    () => assertBrowserDevRuntimeEnvDocument({
      browserOriginMode: 'cross-origin',
      appApiBaseUrl: 'https://api.sdkwork.com',
    }),
    /browser dev runtime-env contract violated/u,
  );
  assert.throws(
    () => assertBrowserDevRuntimeEnvDocument({
      browserOriginMode: 'same-origin',
      VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_BACKEND_HTTP_URL: 'http://127.0.0.1:18081',
    }),
    /process-only topology key/u,
  );
});

test('base-url matrix: dev browser documents are same-origin relative for every profile', () => {
  for (const profileId of ALL_PROFILES) {
    const { deploymentProfile, environment } = profileParts(profileId);
    const dev = resolveCloudRouterBaseUrl({
      deploymentProfile,
      environment,
      phase: 'dev',
      env: parseTopologyEnv(profileId),
    });
    assert.equal(dev.browserOriginMode, 'same-origin', profileId);
    assert.equal(dev.primaryBaseUrl, '/', profileId);
  }
});

test('base-url matrix: standalone build browser documents stay same-origin relative', () => {
  for (const profileId of ALL_PROFILES.filter((id) => id.startsWith('standalone.'))) {
    const { environment } = profileParts(profileId);
    const built = resolveCloudRouterBaseUrl({
      deploymentProfile: 'standalone',
      environment,
      phase: 'build',
      env: parseTopologyEnv(profileId),
    });
    assert.equal(built.browserOriginMode, 'same-origin', profileId);
    assert.equal(built.primaryBaseUrl, '/', profileId);
    assert.equal(built.reason, 'standalone-build-same-origin', profileId);
  }
});

test('base-url matrix: cloud build resolves the registered api family from the repository', () => {
  for (const profileId of ALL_PROFILES.filter((id) => id.startsWith('cloud.'))) {
    const { environment } = profileParts(profileId);
    const env = parseTopologyEnv(profileId);
    const built = resolveCloudRouterBaseUrl({
      deploymentProfile: 'cloud',
      environment,
      phase: 'build',
      env,
      repositoryRoot: REPO,
    });
    assert.equal(built.browserOriginMode, 'cross-origin', profileId);
    assert.equal(
      new URL(built.primaryBaseUrl).hostname,
      CLOUD_PRIMARY_HOST_BY_ENVIRONMENT[environment],
      profileId,
    );
    // The declared platform gateway env binding agrees with the derived family.
    const declaredGateway = env.VITE_SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL;
    if (declaredGateway) {
      assert.equal(new URL(declaredGateway).hostname, new URL(built.primaryBaseUrl).hostname, profileId);
    }
    assert.ok(built.baseUrls.length >= 2, `${profileId} materializes the multi-domain family`);
  }
});

test('base-url matrix: standalone dev transport resolves the env-declared page edge', () => {
  const devEnv = parseTopologyEnv('standalone.development');
  const dev = resolveCloudRouterBaseUrl({
    deploymentProfile: 'standalone',
    environment: 'development',
    phase: 'dev',
    surface: 'transport',
    env: devEnv,
  });
  // The adaptive web dev ingress is the browser-visible same-origin page edge.
  assert.equal(dev.primaryBaseUrl, 'http://127.0.0.1:4734');

  const prodEnv = parseTopologyEnv('standalone.production');
  const prod = resolveCloudRouterBaseUrl({
    deploymentProfile: 'standalone',
    environment: 'production',
    phase: 'build',
    surface: 'transport',
    env: prodEnv,
  });
  assert.equal(prod.primaryBaseUrl, 'https://router.sdkwork.com');
});

test('base-url matrix: cloud dev transport binds the local platform gateway only in development', () => {
  const dev = resolveCloudRouterBaseUrl({
    deploymentProfile: 'cloud',
    environment: 'development',
    phase: 'dev',
    surface: 'transport',
    env: parseTopologyEnv('cloud.development'),
  });
  assert.equal(dev.primaryBaseUrl, 'http://127.0.0.1:3900');
  assert.equal(dev.reason, 'cloud-dev-local-gateway');

  // Deploy-profile bags declare no local gateway: a cloud dev transport must
  // fail closed instead of contacting the domain edge.
  assert.throws(
    () => resolveCloudRouterBaseUrl({
      deploymentProfile: 'cloud',
      environment: 'production',
      phase: 'dev',
      surface: 'transport',
      env: parseTopologyEnv('cloud.production'),
    }),
    /SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL/u,
  );
});

test('base-url matrix: standalone dev bags never authorize a port-bearing build edge', () => {
  assert.throws(
    () => resolveCloudRouterBaseUrl({
      deploymentProfile: 'standalone',
      environment: 'development',
      phase: 'build',
      surface: 'transport',
      env: parseTopologyEnv('standalone.development'),
    }),
    /without a port/u,
  );
});

test('multi-domain auto-selection maps module pages onto their same-brand gateway', () => {
  const family = resolveCloudRouterBaseUrl({
    deploymentProfile: 'cloud',
    environment: 'development',
    phase: 'build',
    env: parseTopologyEnv('cloud.development'),
    repositoryRoot: REPO,
  });
  assert.deepEqual(
    selectBaseUrlForPageHost(family.baseUrls, {
      pageHost: 'cloudrouter-dev.sdkwork.com',
      environment: 'development',
      deploymentProfile: 'cloud',
    }).url,
    'https://api-dev.sdkwork.com',
  );
  assert.deepEqual(
    selectBaseUrlForPageHost(family.baseUrls, {
      pageHost: 'router-dev.sdkwork.cn',
      environment: 'development',
      deploymentProfile: 'cloud',
    }).url,
    'https://api-dev.sdkwork.cn',
  );
  assert.ok(splitBaseUrls(family.materialized).length === family.baseUrls.length);
});
