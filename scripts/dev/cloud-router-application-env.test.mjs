import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs, {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS,
  CLOUD_ROUTER_LOCAL_PLATFORM_API_GATEWAY_ENV_KEY,
  alignCloudLocalGatewayBrowserDevelopmentEnv,
  migrateLegacyBrowserDevelopmentEnvRecord,
  sanitizeBrowserDevelopmentEnvRecord,
  sanitizeBrowserProductionEnvRecord,
} from '../lib/cloud-router-browser-env-contract.mjs';
import {
  CLOUD_ROUTER_RELEASE_ENV_KEY_ORDER,
  buildCloudRouterBrowserProductionGeneratedEnv,
  buildCloudRouterReleaseGeneratedEnv,
  ensureCloudRouterBrowserDevelopmentEnv,
  ensureCloudRouterBrowserProductionEnv,
  ensureCloudRouterReleaseEnv,
} from './cloud-router-application-env.mjs';
import { loadEnvFile, mergeEnvRecordPreservingExistingNonEmpty } from '../lib/merge-env-file.mjs';
import {
  resolveApplicationEnvFileNames,
  resolveApplicationEnvPaths,
  resolveFrameworkEnvLoadOrder,
} from '../lib/sdkwork-application-env.mjs';
import { signLocalAppSessionAccessToken } from './sign-local-app-session-access-token.mjs';

const COMPLIANT_BOOTSTRAP_ACCESS_TOKEN = signLocalAppSessionAccessToken({
  appSessionSecret: 'sdkwork-cloudrouter-local-dev-secret-20260507',
  environment: 'development',
  nowUnixSeconds: 1_800_000_000,
});

/** Public application access token fixture (`APP_ACCESS_TOKEN_SPEC.md`). */
const PUBLIC_APPLICATION_ACCESS_TOKEN = (() => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', kid: 'public-app-token', typ: 'JWT' }),
    encode({
      app_id: 'sdkwork-cloudrouter',
      environment: 'production',
      exp: 4102444800,
      token_class: 'application',
      token_type: 'access',
    }),
    'public',
  ].join('.');
})();

const RETIRED_CLOUD_LIFECYCLE_ENV_KEYS = Object.freeze([
  'SDKWORK_CLOUDROUTER_CONFIG_PROFILE',
  'SDKWORK_CLOUDROUTER_ENVIRONMENT',
  'SDKWORK_CLOUDROUTER_DEPLOYMENT_PROFILE',
  'SDKWORK_CLOUDROUTER_RUNTIME_TARGET',
]);

function captureProfileWrites(profileFilePath, operation) {
  const resolvedProfileFilePath = path.resolve(profileFilePath);
  const originalWriteFileSync = fs.writeFileSync;
  const writtenContents = [];
  fs.writeFileSync = (...args) => {
    if (path.resolve(String(args[0])) === resolvedProfileFilePath) {
      writtenContents.push(String(args[1]));
    }
    return originalWriteFileSync(...args);
  };
  syncBuiltinESMExports();

  try {
    return {
      result: operation(),
      writtenContents,
    };
  } finally {
    fs.writeFileSync = originalWriteFileSync;
    syncBuiltinESMExports();
  }
}

test('resolveApplicationEnvFileNames uses two-dimensional profile files without .local suffix', () => {
  assert.deepEqual(resolveApplicationEnvFileNames('development'), {
    configProfile: 'development',
    profileBasename: 'standalone.development',
    canonicalEnvironment: 'development',
    exampleFileName: '.env.standalone.development.example',
    profileFileName: '.env.standalone.development',
    genericExampleFileName: '.env.example',
  });
  assert.equal(resolveApplicationEnvFileNames('release').profileFileName, '.env.standalone.production');
  assert.equal(resolveApplicationEnvFileNames('release').profileFileName.includes('.local'), false);
});

test('resolveFrameworkEnvLoadOrder avoids .local layers', () => {
  assert.deepEqual(
    resolveFrameworkEnvLoadOrder({ framework: 'vite', configProfile: 'development' }),
    ['.env', '.env.standalone.development'],
  );
});

test('mergeEnvRecordPreservingExistingNonEmpty keeps existing non-empty values', () => {
  const merged = mergeEnvRecordPreservingExistingNonEmpty(
    {
      SDKWORK_ACCESS_TOKEN: 'user-token',
      [CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi]: '',
    },
    {
      SDKWORK_ACCESS_TOKEN: 'generated-token',
      [CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi]: 'http://127.0.0.1:3900',
    },
    ['SDKWORK_ACCESS_TOKEN'],
  );

  assert.equal(merged.SDKWORK_ACCESS_TOKEN, 'user-token');
  assert.equal(merged[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi], 'http://127.0.0.1:3900');
});

test('sanitizeBrowserDevelopmentEnvRecord migrates legacy keys and strips PORTAL_PUBLIC_*', () => {
  const sanitized = sanitizeBrowserDevelopmentEnvRecord({
    PORTAL_DEV_PROXY_GATEWAY_TARGET: 'http://127.0.0.1:3999',
    PORTAL_PUBLIC_API_BASE_URL: '/v1',
    VITE_CLOUDROUTER_APP_API_BASE_URL: '/app/v3/api',
  });

  assert.equal(sanitized[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi], 'http://127.0.0.1:3999');
  assert.equal(sanitized.PORTAL_DEV_PROXY_GATEWAY_TARGET, undefined);
  assert.equal(sanitized.PORTAL_PUBLIC_API_BASE_URL, undefined);
  assert.equal(sanitized.VITE_CLOUDROUTER_APP_API_BASE_URL, '/app/v3/api');
});

test('migrateLegacyBrowserDevelopmentEnvRecord maps PORTAL_PUBLIC_* to VITE_* when missing', () => {
  const migrated = migrateLegacyBrowserDevelopmentEnvRecord({
    PORTAL_PUBLIC_BACKEND_API_BASE_URL: '/backend/v3/api',
    PORTAL_PUBLIC_TOOL_API_ENABLED: 'false',
  });

  assert.equal(migrated.VITE_CLOUDROUTER_BACKEND_API_BASE_URL, '/backend/v3/api');
  assert.equal(migrated.VITE_TOOL_API_ENABLED, 'false');
  assert.equal(migrated.PORTAL_PUBLIC_BACKEND_API_BASE_URL, undefined);
});

test('ensureCloudRouterBrowserDevelopmentEnv writes .env.standalone.development and preserves overrides', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'cloud-router-browser-env-'));
  const applicationRoot = path.join(tempRoot, 'apps', 'sdkwork-cloudrouter-pc');
  const manifestPath = path.join(tempRoot, 'agent.app.config.json');
  const profileFilePath = path.join(applicationRoot, '.env.standalone.development');

  try {
    writeFileSync(
      manifestPath,
      JSON.stringify({
        app: { key: 'sdkwork-cloudrouter' },
        backend: {
          appId: 'sdkwork-cloudrouter',
          tenantId: '100001',
          organizationId: '0',
          accessTokenPermissionScope: ['iam.users.read'],
        },
      }),
      'utf8',
    );
    mkdirSync(applicationRoot, { recursive: true });
    writeFileSync(
      profileFilePath,
      [
        'SDKWORK_CLOUDROUTER_CONFIG_PROFILE=dev',
        'SDKWORK_CLOUDROUTER_ENVIRONMENT=development',
        'SDKWORK_CLOUDROUTER_DEPLOYMENT_PROFILE=standalone',
        'SDKWORK_CLOUDROUTER_RUNTIME_TARGET=browser',
        'SDKWORK_ACCESS_TOKEN=' + COMPLIANT_BOOTSTRAP_ACCESS_TOKEN,
        'PORTAL_DEV_PROXY_GATEWAY_TARGET=http://127.0.0.1:3999',
        'PORTAL_PUBLIC_API_BASE_URL=/v1',
        '',
      ].join('\n'),
      'utf8',
    );

    const homeDir = path.join(tempRoot, 'home');
    const result = ensureCloudRouterBrowserDevelopmentEnv({
      workspaceRoot: tempRoot,
      applicationRoot,
      portalRuntimeEnv: {
        [CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi]: 'http://127.0.0.1:3900',
      },
      homeDir,
    });

    const written = readFileSync(profileFilePath, 'utf8');

    assert.equal(result.profileFilePath, profileFilePath);
    assert.equal(result.mergedEnv.SDKWORK_ACCESS_TOKEN, '');
    const bundle = JSON.parse(
      readFileSync(
        path.join(homeDir, '.sdkwork', 'cloudrouter', 'credentials', 'standalone.development.json'),
        'utf8',
      ),
    );
    assert.equal(
      typeof bundle.accessToken === 'string' && bundle.accessToken.startsWith('eyJ'),
      true,
    );
    // The repository tree never receives a credential file.
    assert.deepEqual(
      fs.readdirSync(applicationRoot).filter((name) => name.includes('bootstrap.local')),
      [],
    );
    assert.equal(result.mergedEnv[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi], 'http://127.0.0.1:3999');
    assert.equal(result.mergedEnv[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi], 'http://127.0.0.1:3900');
    assert.equal(result.mergedEnv.PORTAL_PUBLIC_API_BASE_URL, undefined);
    assert.equal(result.mergedEnv.VITE_API_BASE_URL, '/v1');
    assert.equal(result.mergedEnv.VITE_TOOL_API_ENABLED, 'false');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_CONFIG_PROFILE, 'dev');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT, 'development');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE, 'standalone');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_RUNTIME_TARGET, 'browser');
    for (const retiredKey of RETIRED_CLOUD_LIFECYCLE_ENV_KEYS) {
      assert.equal(result.mergedEnv[retiredKey], undefined);
    }
    assert.match(written, /SDKWORK_CLOUDROUTER_BROWSER_DEV_PROXY_OPEN_API_ORIGIN=http:\/\/127\.0\.0\.1:3999/u);
    assert.doesNotMatch(written, /^PORTAL_PUBLIC_/mu);
    assert.doesNotMatch(written, /^PORTAL_DEV_PROXY_/mu);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('alignCloudLocalGatewayBrowserDevelopmentEnv rewrites stale domain base URLs', () => {
  const gatewayHttpUrl = 'http://127.0.0.1:3900';
  const aligned = alignCloudLocalGatewayBrowserDevelopmentEnv({
    VITE_API_BASE_URL: 'https://api-dev.sdkwork.com/v1',
    VITE_CLOUDROUTER_OPEN_API_BASE_URL: 'https://api-dev.sdkwork.com/v1',
    VITE_CLOUDROUTER_APP_API_BASE_URL: 'https://api-dev.sdkwork.com/app/v3/api',
    VITE_CLOUDROUTER_BACKEND_API_BASE_URL: 'https://api-dev.sdkwork.com/backend/v3/api',
    VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL: 'http://drive-dev.sdkwork.com:3900',
  }, { localPlatformApiGatewayHttpUrl: gatewayHttpUrl });

  assert.equal(aligned.VITE_API_BASE_URL, '/v1');
  assert.equal(aligned.VITE_CLOUDROUTER_OPEN_API_BASE_URL, '/v1');
  assert.equal(aligned.VITE_CLOUDROUTER_APP_API_BASE_URL, '/app/v3/api');
  assert.equal(aligned.VITE_CLOUDROUTER_BACKEND_API_BASE_URL, '/backend/v3/api');
  assert.equal(
    aligned[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi],
    gatewayHttpUrl,
  );
  assert.equal(
    aligned[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi],
    gatewayHttpUrl,
  );
  assert.equal(
    aligned[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.appApi],
    gatewayHttpUrl,
  );
  // Federated drive surface stays on its owned gateway domain.
  assert.equal(aligned.VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL, 'http://drive-dev.sdkwork.com:3900');

  // Without the local gateway override the record is returned untouched.
  const untouched = alignCloudLocalGatewayBrowserDevelopmentEnv({
    VITE_CLOUDROUTER_APP_API_BASE_URL: 'https://api-dev.sdkwork.com/app/v3/api',
  });
  assert.equal(untouched.VITE_CLOUDROUTER_APP_API_BASE_URL, 'https://api-dev.sdkwork.com/app/v3/api');
});

test('ensureCloudRouterBrowserDevelopmentEnv binds cloud dev to the local platform gateway', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'cloud-router-browser-env-'));
  const applicationRoot = path.join(tempRoot, 'apps', 'sdkwork-cloudrouter-pc');
  const manifestPath = path.join(tempRoot, 'agent.app.config.json');
  const profileFilePath = path.join(applicationRoot, '.env.standalone.development');

  try {
    writeFileSync(
      manifestPath,
      JSON.stringify({
        app: { key: 'sdkwork-cloudrouter' },
        backend: {
          appId: 'sdkwork-cloudrouter',
          tenantId: '100001',
          organizationId: '0',
          accessTokenPermissionScope: ['iam.users.read'],
        },
      }),
      'utf8',
    );
    mkdirSync(applicationRoot, { recursive: true });
    // Stale cloud dev profile persisted before the local-gateway convention:
    // absolute domain base URLs that bypass the Vite dev proxy entirely.
    writeFileSync(
      profileFilePath,
      [
        'SDKWORK_CLOUDROUTER_ROUTER_CONFIG_PROFILE=dev',
        'SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT=development',
        'SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE=cloud',
        'SDKWORK_CLOUDROUTER_ROUTER_RUNTIME_TARGET=browser',
        'VITE_CLOUDROUTER_APP_API_BASE_URL=https://api-dev.sdkwork.com/app/v3/api',
        'VITE_CLOUDROUTER_BACKEND_API_BASE_URL=https://api-dev.sdkwork.com/backend/v3/api',
        '',
      ].join('\n'),
      'utf8',
    );

    const result = ensureCloudRouterBrowserDevelopmentEnv({
      workspaceRoot: tempRoot,
      applicationRoot,
      deploymentProfile: 'cloud',
      env: {
        [CLOUD_ROUTER_LOCAL_PLATFORM_API_GATEWAY_ENV_KEY]: 'http://127.0.0.1:3900',
      },
    });

    assert.equal(result.mergedEnv.VITE_CLOUDROUTER_APP_API_BASE_URL, '/app/v3/api');
    assert.equal(result.mergedEnv.VITE_CLOUDROUTER_BACKEND_API_BASE_URL, '/backend/v3/api');
    assert.equal(result.mergedEnv.VITE_API_BASE_URL, '/v1');
    assert.equal(
      result.mergedEnv[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.appApi],
      'http://127.0.0.1:3900',
    );
    assert.equal(
      result.mergedEnv[CLOUD_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi],
      'http://127.0.0.1:3900',
    );

    const written = readFileSync(profileFilePath, 'utf8');
    assert.match(written, /VITE_CLOUDROUTER_APP_API_BASE_URL=\/app\/v3\/api/u);
    assert.doesNotMatch(written, /api-dev\.sdkwork\.com\/app\/v3\/api/u);
    assert.match(
      written,
      /SDKWORK_CLOUDROUTER_BROWSER_DEV_PROXY_APP_API_ORIGIN=http:\/\/127\.0\.0\.1:3900/u,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('production and release generated env records omit SDKWORK_ACCESS_TOKEN', () => {
  const env = { SDKWORK_ACCESS_TOKEN: 'test-only-input-token' };
  const generatedRecords = [
    buildCloudRouterBrowserProductionGeneratedEnv({ env }),
    buildCloudRouterReleaseGeneratedEnv({ env }),
  ];

  for (const generated of generatedRecords) {
    assert.equal(Object.hasOwn(generated, 'SDKWORK_ACCESS_TOKEN'), false);
  }
  assert.equal(CLOUD_ROUTER_RELEASE_ENV_KEY_ORDER.includes('SDKWORK_ACCESS_TOKEN'), false);
});

test('ensureCloudRouterReleaseEnv writes a token-free .env.standalone.production from example defaults', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'cloud-router-release-env-'));

  try {
    writeFileSync(
      path.join(tempRoot, 'agent.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-cloudrouter' },
        backend: { appId: 'sdkwork-cloudrouter', tenantId: '100001', organizationId: '0' },
      }),
      'utf8',
    );
    writeFileSync(
      path.join(tempRoot, '.env.standalone.production.example'),
      [
        'PORTAL_PUBLIC_SDK_BASE_URL="/"',
        'PORTAL_PUBLIC_API_BASE_URL="/v1"',
        'PORTAL_PUBLIC_APP_API_BASE_URL="/app/v3/api"',
        '',
      ].join('\n'),
      'utf8',
    );

    const result = ensureCloudRouterReleaseEnv({
      workspaceRoot: tempRoot,
    });

    assert.equal(result.profileFilePath, path.join(tempRoot, '.env.standalone.production'));
    assert.equal(result.mergedEnv.PORTAL_PUBLIC_SDK_BASE_URL, '/');
    assert.equal(result.mergedEnv.PORTAL_PUBLIC_API_BASE_URL, '/v1');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_TOOL_API_RATE_LIMIT_REQUESTS, '120');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_TOOL_API_RATE_LIMIT_WINDOW_SECONDS, '60');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_CONFIG_PROFILE, 'prod');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT, 'production');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE, 'standalone');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_RUNTIME_TARGET, 'server');
    for (const retiredKey of RETIRED_CLOUD_LIFECYCLE_ENV_KEYS) {
      assert.equal(result.mergedEnv[retiredKey], undefined);
    }
    assert.equal(Object.hasOwn(result.mergedEnv, 'SDKWORK_ACCESS_TOKEN'), false);
    assert.doesNotMatch(
      readFileSync(path.join(tempRoot, '.env.standalone.production'), 'utf8'),
      /^SDKWORK_ACCESS_TOKEN=/mu,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('ensureCloudRouterBrowserProductionEnv omits token state and production bootstrap overlay', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'cloud-router-production-env-'));
  const applicationRoot = path.join(tempRoot, 'apps', 'sdkwork-cloudrouter-pc');
  const profileFilePath = path.join(applicationRoot, '.env.standalone.production');

  try {
    writeFileSync(
      path.join(tempRoot, 'agent.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-cloudrouter' },
        backend: { appId: 'sdkwork-cloudrouter', tenantId: '100001', organizationId: '0' },
      }),
      'utf8',
    );
    mkdirSync(applicationRoot, { recursive: true });
    writeFileSync(
      profileFilePath,
      [
        'SDKWORK_ACCESS_TOKEN=' + COMPLIANT_BOOTSTRAP_ACCESS_TOKEN,
        'PORTAL_PUBLIC_API_BASE_URL=/v1',
        'PORTAL_DEV_PROXY_GATEWAY_TARGET=http://127.0.0.1:3900',
        '',
      ].join('\n'),
      'utf8',
    );

    const { result, writtenContents } = captureProfileWrites(
      profileFilePath,
      () => ensureCloudRouterBrowserProductionEnv({
        workspaceRoot: tempRoot,
        applicationRoot,
      }),
    );

    const written = readFileSync(profileFilePath, 'utf8');

    assert.equal(writtenContents.length, 1);
    assert.equal(
      writtenContents.some((content) => /^SDKWORK_ACCESS_TOKEN=/mu.test(content)),
      false,
    );
    assert.equal(result.profileFilePath, profileFilePath);
    assert.equal(Object.hasOwn(result.mergedEnv, 'SDKWORK_ACCESS_TOKEN'), false);
    assert.deepEqual(
      fs.readdirSync(applicationRoot).filter((name) => name.includes('bootstrap.local')),
      [],
    );
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_CONFIG_PROFILE, 'prod');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT, 'production');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE, 'standalone');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_RUNTIME_TARGET, 'browser');
    for (const retiredKey of RETIRED_CLOUD_LIFECYCLE_ENV_KEYS) {
      assert.equal(result.mergedEnv[retiredKey], undefined);
    }
    assert.equal(result.mergedEnv.PORTAL_PUBLIC_API_BASE_URL, undefined);
    assert.doesNotMatch(written, /^PORTAL_/mu);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('browser env sanitizers keep the committed public application token and strip private credentials', () => {
  assert.equal(
    sanitizeBrowserDevelopmentEnvRecord({ SDKWORK_ACCESS_TOKEN: PUBLIC_APPLICATION_ACCESS_TOKEN })
      .SDKWORK_ACCESS_TOKEN,
    PUBLIC_APPLICATION_ACCESS_TOKEN,
  );
  assert.equal(
    sanitizeBrowserDevelopmentEnvRecord({ SDKWORK_ACCESS_TOKEN: COMPLIANT_BOOTSTRAP_ACCESS_TOKEN })
      .SDKWORK_ACCESS_TOKEN,
    '',
  );
  assert.equal(
    sanitizeBrowserProductionEnvRecord({ SDKWORK_ACCESS_TOKEN: PUBLIC_APPLICATION_ACCESS_TOKEN })
      .SDKWORK_ACCESS_TOKEN,
    PUBLIC_APPLICATION_ACCESS_TOKEN,
  );
  assert.equal(
    Object.hasOwn(
      sanitizeBrowserProductionEnvRecord({ SDKWORK_ACCESS_TOKEN: COMPLIANT_BOOTSTRAP_ACCESS_TOKEN }),
      'SDKWORK_ACCESS_TOKEN',
    ),
    false,
  );
});

test('ensureCloudRouterBrowserProductionEnv keeps the public application token so builds can embed it', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'cloud-router-production-public-token-'));
  const applicationRoot = path.join(tempRoot, 'apps', 'sdkwork-cloudrouter-pc');
  const profileFilePath = path.join(applicationRoot, '.env.standalone.production');

  try {
    writeFileSync(
      path.join(tempRoot, 'agent.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-cloudrouter' },
        backend: { appId: 'sdkwork-cloudrouter', tenantId: '100001', organizationId: '0' },
      }),
      'utf8',
    );
    mkdirSync(applicationRoot, { recursive: true });
    writeFileSync(
      profileFilePath,
      [
        'SDKWORK_ACCESS_TOKEN=' + PUBLIC_APPLICATION_ACCESS_TOKEN,
        'PORTAL_PUBLIC_API_BASE_URL=/v1',
        '',
      ].join('\n'),
      'utf8',
    );

    const result = ensureCloudRouterBrowserProductionEnv({
      workspaceRoot: tempRoot,
      applicationRoot,
    });

    assert.equal(result.mergedEnv.SDKWORK_ACCESS_TOKEN, PUBLIC_APPLICATION_ACCESS_TOKEN);
    assert.match(
      readFileSync(profileFilePath, 'utf8'),
      new RegExp(`^SDKWORK_ACCESS_TOKEN=${PUBLIC_APPLICATION_ACCESS_TOKEN}$`, 'mu'),
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('ensureCloudRouterReleaseEnv migrates legacy private edge keys to canonical names', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'cloud-router-release-edge-env-'));

  try {
    writeFileSync(
      path.join(tempRoot, 'agent.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-cloudrouter' },
        backend: { appId: 'sdkwork-cloudrouter', tenantId: '100001', organizationId: '0' },
      }),
      'utf8',
    );
    writeFileSync(
      path.join(tempRoot, '.env.standalone.production.example'),
      [
        'PORTAL_PUBLIC_SDK_BASE_URL="/"',
        'PORTAL_PUBLIC_API_BASE_URL="/v1"',
        '',
      ].join('\n'),
      'utf8',
    );
    writeFileSync(
      path.join(tempRoot, '.env.standalone.production'),
      [
        'PORTAL_PUBLIC_SDK_BASE_URL="/"',
        'PORTAL_TOOL_API_RATE_LIMIT_REQUESTS=240',
        'PORTAL_CSP_CONNECT_SRC=https://legacy.example.com',
        '',
      ].join('\n'),
      'utf8',
    );

    const result = ensureCloudRouterReleaseEnv({
      workspaceRoot: tempRoot,
    });

    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_TOOL_API_RATE_LIMIT_REQUESTS, '240');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_EDGE_CSP_CONNECT_SRC, 'https://legacy.example.com');
    assert.equal(result.mergedEnv.PORTAL_TOOL_API_RATE_LIMIT_REQUESTS, undefined);
    assert.equal(result.mergedEnv.PORTAL_CSP_CONNECT_SRC, undefined);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('ensureCloudRouterReleaseEnv replaces retired lifecycle keys and the release profile alias', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'cloud-router-release-backfill-'));
  const profileFilePath = path.join(tempRoot, '.env.standalone.production');

  try {
    writeFileSync(
      path.join(tempRoot, 'agent.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-cloudrouter' },
        backend: { appId: 'sdkwork-cloudrouter', tenantId: '100001', organizationId: '0' },
      }),
      'utf8',
    );
    writeFileSync(
      path.join(tempRoot, '.env.standalone.production.example'),
      [
        'PORTAL_PUBLIC_SDK_BASE_URL="/"',
        'PORTAL_PUBLIC_API_BASE_URL="/v1"',
        '',
      ].join('\n'),
      'utf8',
    );
    writeFileSync(
      profileFilePath,
      [
        'SDKWORK_CLOUDROUTER_ROUTER_CONFIG_PROFILE=release',
        'SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT=production',
        'SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE=standalone',
        'SDKWORK_CLOUDROUTER_ROUTER_RUNTIME_TARGET=server',
        'SDKWORK_CLOUDROUTER_CONFIG_PROFILE=release',
        'SDKWORK_CLOUDROUTER_ENVIRONMENT=development',
        'SDKWORK_CLOUDROUTER_DEPLOYMENT_PROFILE=cloud',
        'SDKWORK_CLOUDROUTER_RUNTIME_TARGET=browser',
        'SDKWORK_ACCESS_TOKEN=' + COMPLIANT_BOOTSTRAP_ACCESS_TOKEN,
        'PORTAL_PUBLIC_SDK_BASE_URL=/',
        'PORTAL_PUBLIC_API_BASE_URL=/v1',
        'PORTAL_PUBLIC_BACKEND_API_BASE_URL=/backend/v3/api',
        'PORTAL_PUBLIC_TOOL_API_ENABLED=false',
        'SDKWORK_CLOUDROUTER_TOOL_API_RATE_LIMIT_REQUESTS=120',
        'SDKWORK_CLOUDROUTER_TOOL_API_RATE_LIMIT_WINDOW_SECONDS=60',
        '',
      ].join('\n'),
      'utf8',
    );

    const { result, writtenContents } = captureProfileWrites(
      profileFilePath,
      () => ensureCloudRouterReleaseEnv({
        workspaceRoot: tempRoot,
      }),
    );

    assert.equal(writtenContents.length, 1);
    assert.equal(
      writtenContents.some((content) => /^SDKWORK_ACCESS_TOKEN=/mu.test(content)),
      false,
    );
    assert.equal(result.changed, true);
    assert.equal(Object.hasOwn(result.mergedEnv, 'SDKWORK_ACCESS_TOKEN'), false);
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_CONFIG_PROFILE, 'prod');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT, 'production');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE, 'standalone');
    assert.equal(result.mergedEnv.SDKWORK_CLOUDROUTER_ROUTER_RUNTIME_TARGET, 'server');
    for (const retiredKey of RETIRED_CLOUD_LIFECYCLE_ENV_KEYS) {
      assert.equal(result.mergedEnv[retiredKey], undefined);
    }
    for (const key of CLOUD_ROUTER_RELEASE_ENV_KEY_ORDER) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(result.mergedEnv, key),
        `expected merged env to include ${key}`,
      );
    }

    const writtenRecord = loadEnvFile(profileFilePath);
    assert.equal(writtenRecord.SDKWORK_CLOUDROUTER_ROUTER_CONFIG_PROFILE, 'prod');
    for (const retiredKey of RETIRED_CLOUD_LIFECYCLE_ENV_KEYS) {
      assert.equal(writtenRecord[retiredKey], undefined);
    }
    for (const key of CLOUD_ROUTER_RELEASE_ENV_KEY_ORDER) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(writtenRecord, key),
        `expected written profile to include ${key}`,
      );
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('ensureCloudRouterReleaseEnv writes comment-prefixed edge key documentation', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'cloud-router-release-format-'));

  try {
    writeFileSync(
      path.join(tempRoot, 'agent.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-cloudrouter' },
        backend: { appId: 'sdkwork-cloudrouter', tenantId: '100001', organizationId: '0' },
      }),
      'utf8',
    );
    writeFileSync(
      path.join(tempRoot, '.env.standalone.production.example'),
      [
        'PORTAL_PUBLIC_SDK_BASE_URL="/"',
        'PORTAL_PUBLIC_API_BASE_URL="/v1"',
        '',
      ].join('\n'),
      'utf8',
    );

    ensureCloudRouterReleaseEnv({
      workspaceRoot: tempRoot,
    });

    const written = readFileSync(path.join(tempRoot, '.env.standalone.production'), 'utf8');
    assert.match(written, /^# Server-side rate limit/m);
    assert.doesNotMatch(written, /^Server-side rate limit/m);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('signLocalAppSessionAccessToken emits v2 access claim tokens', () => {
  const token = signLocalAppSessionAccessToken({
    environment: 'development',
    appSessionSecret: 'sdkwork-cloudrouter-local-dev-secret-20260507',
    nowUnixSeconds: 1_800_000_000,
  });

  assert.match(token, /^v2\.[A-Za-z0-9_-]+\.[0-9a-f]{64}$/u);

  const encodedPayload = token.split('.')[1];
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  assert.equal(payload.token_version, 1);
  assert.equal(payload.tenant_id, '100001');
  assert.equal(payload.app_id, 'sdkwork-cloudrouter');
  assert.equal(payload.login_scope, 'TENANT');
});

test('fixed local signer requires an explicit development lifecycle', () => {
  const appSessionSecret = 'test-only-local-signing-material'.padEnd(32, 'x');
  assert.throws(
    () => signLocalAppSessionAccessToken({
      appSessionSecret,
      nowUnixSeconds: 1_800_000_000,
    }),
    /explicit development lifecycle/u,
  );
  assert.throws(
    () => signLocalAppSessionAccessToken({
      appSessionSecret,
      environment: 'production',
      nowUnixSeconds: 1_800_000_000,
    }),
    /development lifecycle/u,
  );
});

test('direct profile CLI rejects unknown profiles before invoking the local signer', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'cloud-router-profile-cli-'));
  const applicationRoot = path.join(tempRoot, 'apps', 'sdkwork-cloudrouter-pc');

  try {
    mkdirSync(applicationRoot, { recursive: true });
    writeFileSync(
      path.join(tempRoot, 'agent.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-cloudrouter' },
        backend: { tenantId: '100001', organizationId: '0' },
      }),
      'utf8',
    );

    const cliResult = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL('./cloud-router-application-env.mjs', import.meta.url)),
        '--workspace-root',
        tempRoot,
        '--profile',
        'unsupported-profile',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          SDKWORK_CLOUDROUTER_APP_SESSION_SECRET: 'too-short',
        },
      },
    );

    assert.notEqual(cliResult.status, 0);
    assert.match(cliResult.stderr, /unsupported profile/u);
    assert.deepEqual(
      fs.readdirSync(applicationRoot).filter((name) => name.includes('bootstrap.local')),
      [],
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('ensureCloudRouterBrowserDevelopmentEnv refreshes stale bootstrap access tokens', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'cloud-router-env-'));
  const appRoot = path.join(tempRoot, 'apps', 'sdkwork-cloudrouter-pc');
  mkdirSync(appRoot, { recursive: true });
  writeFileSync(
    path.join(tempRoot, 'agent.app.config.json'),
    JSON.stringify({
      app: { key: 'sdkwork-cloudrouter' },
      backend: { appId: 'sdkwork-cloudrouter', tenantId: '100001', organizationId: '0' },
    }),
    'utf8',
  );
  const staleToken = 'v2.eyJ0b2tlbktpbmQiOiJhY2Nlc3MiLCJ0ZW5hbnRJZCI6MTAwMDAxfQ.stale';
  writeFileSync(
    path.join(appRoot, '.env.standalone.development'),
    `SDKWORK_ACCESS_TOKEN=${staleToken}\n`,
    'utf8',
  );

  const homeDir = path.join(tempRoot, 'home');

  try {
    const result = ensureCloudRouterBrowserDevelopmentEnv({
      workspaceRoot: tempRoot,
      applicationRoot: appRoot,
      homeDir,
    });
    const bundle = JSON.parse(
      readFileSync(
        path.join(homeDir, '.sdkwork', 'cloudrouter', 'credentials', 'standalone.development.json'),
        'utf8',
      ),
    );
    assert.notEqual(bundle.accessToken, staleToken);
    assert.match(bundle.accessToken, /^eyJ/u);
    const encodedPayload = bundle.accessToken.split('.')[1];
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    assert.equal(payload.token_version, 1);
    assert.equal(payload.environment, 'development');
    assert.equal(result.mergedEnv.SDKWORK_ACCESS_TOKEN, '');
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('resolveApplicationEnvPaths selects browser app root for Vite profiles', () => {
  const paths = resolveApplicationEnvPaths({
    workspaceRoot: '/repo',
    applicationRoot: '/repo/apps/sdkwork-cloudrouter-pc',
    configProfile: 'development',
    runtimeTarget: 'browser',
  });

  assert.ok(
    paths.profileFilePath.endsWith(path.join('apps', 'sdkwork-cloudrouter-pc', '.env.standalone.development')),
  );
});
