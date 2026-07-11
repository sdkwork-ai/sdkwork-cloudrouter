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
  CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS,
  migrateLegacyBrowserDevelopmentEnvRecord,
  sanitizeBrowserDevelopmentEnvRecord,
} from '../lib/claw-router-browser-env-contract.mjs';
import {
  CLAW_ROUTER_RELEASE_ENV_KEY_ORDER,
  buildClawRouterBrowserProductionGeneratedEnv,
  buildClawRouterReleaseGeneratedEnv,
  ensureClawRouterBrowserDevelopmentEnv,
  ensureClawRouterBrowserProductionEnv,
  ensureClawRouterReleaseEnv,
} from './claw-router-application-env.mjs';
import { loadEnvFile, mergeEnvRecordPreservingExistingNonEmpty } from '../lib/merge-env-file.mjs';
import {
  resolveApplicationEnvFileNames,
  resolveApplicationEnvPaths,
  resolveFrameworkEnvLoadOrder,
} from '../lib/sdkwork-application-env.mjs';
import { signLocalAppSessionAccessToken } from './sign-local-app-session-access-token.mjs';

const COMPLIANT_BOOTSTRAP_ACCESS_TOKEN = signLocalAppSessionAccessToken({
  appSessionSecret: 'sdkwork-clawrouter-local-dev-secret-20260507',
  environment: 'development',
  nowUnixSeconds: 1_800_000_000,
});

const RETIRED_CLAW_LIFECYCLE_ENV_KEYS = Object.freeze([
  'SDKWORK_CLAW_CONFIG_PROFILE',
  'SDKWORK_CLAW_ENVIRONMENT',
  'SDKWORK_CLAW_DEPLOYMENT_PROFILE',
  'SDKWORK_CLAW_RUNTIME_TARGET',
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

test('resolveApplicationEnvFileNames uses profile files without .local suffix', () => {
  assert.deepEqual(resolveApplicationEnvFileNames('development'), {
    configProfile: 'development',
    profileBasename: 'development',
    canonicalEnvironment: 'development',
    exampleFileName: '.env.development.example',
    profileFileName: '.env.development',
    genericExampleFileName: '.env.example',
  });
  assert.equal(resolveApplicationEnvFileNames('release').profileFileName, '.env.release');
  assert.equal(resolveApplicationEnvFileNames('release').profileFileName.includes('.local'), false);
});

test('resolveFrameworkEnvLoadOrder avoids .local layers', () => {
  assert.deepEqual(
    resolveFrameworkEnvLoadOrder({ framework: 'vite', configProfile: 'development' }),
    ['.env', '.env.development'],
  );
});

test('mergeEnvRecordPreservingExistingNonEmpty keeps existing non-empty values', () => {
  const merged = mergeEnvRecordPreservingExistingNonEmpty(
    {
      SDKWORK_ACCESS_TOKEN: 'user-token',
      [CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi]: '',
    },
    {
      SDKWORK_ACCESS_TOKEN: 'generated-token',
      [CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi]: 'http://127.0.0.1:3900',
    },
    ['SDKWORK_ACCESS_TOKEN'],
  );

  assert.equal(merged.SDKWORK_ACCESS_TOKEN, 'user-token');
  assert.equal(merged[CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi], 'http://127.0.0.1:3900');
});

test('sanitizeBrowserDevelopmentEnvRecord migrates legacy keys and strips PORTAL_PUBLIC_*', () => {
  const sanitized = sanitizeBrowserDevelopmentEnvRecord({
    PORTAL_DEV_PROXY_GATEWAY_TARGET: 'http://127.0.0.1:3999',
    PORTAL_PUBLIC_API_BASE_URL: '/v1',
    VITE_CLAWROUTER_APP_API_BASE_URL: '/app/v3/api',
  });

  assert.equal(sanitized[CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi], 'http://127.0.0.1:3999');
  assert.equal(sanitized.PORTAL_DEV_PROXY_GATEWAY_TARGET, undefined);
  assert.equal(sanitized.PORTAL_PUBLIC_API_BASE_URL, undefined);
  assert.equal(sanitized.VITE_CLAWROUTER_APP_API_BASE_URL, '/app/v3/api');
});

test('migrateLegacyBrowserDevelopmentEnvRecord maps PORTAL_PUBLIC_* to VITE_* when missing', () => {
  const migrated = migrateLegacyBrowserDevelopmentEnvRecord({
    PORTAL_PUBLIC_BACKEND_API_BASE_URL: '/backend/v3/api',
    PORTAL_PUBLIC_TOOL_API_ENABLED: 'false',
  });

  assert.equal(migrated.VITE_CLAWROUTER_BACKEND_API_BASE_URL, '/backend/v3/api');
  assert.equal(migrated.VITE_TOOL_API_ENABLED, 'false');
  assert.equal(migrated.PORTAL_PUBLIC_BACKEND_API_BASE_URL, undefined);
});

test('ensureClawRouterBrowserDevelopmentEnv writes .env.development and preserves overrides', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'claw-router-browser-env-'));
  const applicationRoot = path.join(tempRoot, 'apps', 'sdkwork-clawrouter-pc');
  const manifestPath = path.join(tempRoot, 'sdkwork.app.config.json');
  const profileFilePath = path.join(applicationRoot, '.env.development');

  try {
    writeFileSync(
      manifestPath,
      JSON.stringify({
        app: { key: 'sdkwork-clawrouter' },
        backend: {
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
        'SDKWORK_CLAW_CONFIG_PROFILE=dev',
        'SDKWORK_CLAW_ENVIRONMENT=development',
        'SDKWORK_CLAW_DEPLOYMENT_PROFILE=standalone',
        'SDKWORK_CLAW_RUNTIME_TARGET=browser',
        'SDKWORK_ACCESS_TOKEN=' + COMPLIANT_BOOTSTRAP_ACCESS_TOKEN,
        'PORTAL_DEV_PROXY_GATEWAY_TARGET=http://127.0.0.1:3999',
        'PORTAL_PUBLIC_API_BASE_URL=/v1',
        '',
      ].join('\n'),
      'utf8',
    );

    const result = ensureClawRouterBrowserDevelopmentEnv({
      workspaceRoot: tempRoot,
      applicationRoot,
      portalRuntimeEnv: {
        [CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi]: 'http://127.0.0.1:3900',
      },
    });

    const written = readFileSync(profileFilePath, 'utf8');

    assert.equal(result.profileFilePath, profileFilePath);
    assert.equal(result.mergedEnv.SDKWORK_ACCESS_TOKEN, '');
    const bootstrapLocal = loadEnvFile(path.join(applicationRoot, '.env.development.bootstrap.local'));
    assert.equal(
      typeof bootstrapLocal.SDKWORK_ACCESS_TOKEN === 'string'
        && bootstrapLocal.SDKWORK_ACCESS_TOKEN.startsWith('v2.'),
      true,
    );
    assert.equal(result.mergedEnv[CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.openApi], 'http://127.0.0.1:3999');
    assert.equal(result.mergedEnv[CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS.backendApi], 'http://127.0.0.1:3900');
    assert.equal(result.mergedEnv.PORTAL_PUBLIC_API_BASE_URL, undefined);
    assert.equal(result.mergedEnv.VITE_API_BASE_URL, '/v1');
    assert.equal(result.mergedEnv.VITE_TOOL_API_ENABLED, 'false');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_CONFIG_PROFILE, 'dev');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_ENVIRONMENT, 'development');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE, 'standalone');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_RUNTIME_TARGET, 'browser');
    for (const retiredKey of RETIRED_CLAW_LIFECYCLE_ENV_KEYS) {
      assert.equal(result.mergedEnv[retiredKey], undefined);
    }
    assert.match(written, /SDKWORK_CLAW_BROWSER_DEV_PROXY_OPEN_API_ORIGIN=http:\/\/127\.0\.0\.1:3999/u);
    assert.doesNotMatch(written, /^PORTAL_PUBLIC_/mu);
    assert.doesNotMatch(written, /^PORTAL_DEV_PROXY_/mu);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('production and release generated env records omit SDKWORK_ACCESS_TOKEN', () => {
  const env = { SDKWORK_ACCESS_TOKEN: 'test-only-input-token' };
  const generatedRecords = [
    buildClawRouterBrowserProductionGeneratedEnv({ env }),
    buildClawRouterReleaseGeneratedEnv({ env }),
  ];

  for (const generated of generatedRecords) {
    assert.equal(Object.hasOwn(generated, 'SDKWORK_ACCESS_TOKEN'), false);
  }
  assert.equal(CLAW_ROUTER_RELEASE_ENV_KEY_ORDER.includes('SDKWORK_ACCESS_TOKEN'), false);
});

test('ensureClawRouterReleaseEnv writes a token-free .env.release from example defaults', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'claw-router-release-env-'));

  try {
    writeFileSync(
      path.join(tempRoot, 'sdkwork.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-clawrouter' },
        backend: { tenantId: '100001', organizationId: '0' },
      }),
      'utf8',
    );
    writeFileSync(
      path.join(tempRoot, '.env.release.example'),
      [
        'PORTAL_PUBLIC_SDK_BASE_URL="/"',
        'PORTAL_PUBLIC_API_BASE_URL="/v1"',
        'PORTAL_PUBLIC_APP_API_BASE_URL="/app/v3/api"',
        '',
      ].join('\n'),
      'utf8',
    );

    const result = ensureClawRouterReleaseEnv({
      workspaceRoot: tempRoot,
    });

    assert.equal(result.profileFilePath, path.join(tempRoot, '.env.release'));
    assert.equal(result.mergedEnv.PORTAL_PUBLIC_SDK_BASE_URL, '/');
    assert.equal(result.mergedEnv.PORTAL_PUBLIC_API_BASE_URL, '/v1');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS, '120');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS, '60');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_CONFIG_PROFILE, 'prod');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_ENVIRONMENT, 'production');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE, 'standalone');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_RUNTIME_TARGET, 'server');
    for (const retiredKey of RETIRED_CLAW_LIFECYCLE_ENV_KEYS) {
      assert.equal(result.mergedEnv[retiredKey], undefined);
    }
    assert.equal(Object.hasOwn(result.mergedEnv, 'SDKWORK_ACCESS_TOKEN'), false);
    assert.doesNotMatch(
      readFileSync(path.join(tempRoot, '.env.release'), 'utf8'),
      /^SDKWORK_ACCESS_TOKEN=/mu,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('ensureClawRouterBrowserProductionEnv omits token state and production bootstrap overlay', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'claw-router-production-env-'));
  const applicationRoot = path.join(tempRoot, 'apps', 'sdkwork-clawrouter-pc');
  const profileFilePath = path.join(applicationRoot, '.env.production');

  try {
    writeFileSync(
      path.join(tempRoot, 'sdkwork.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-clawrouter' },
        backend: { tenantId: '100001', organizationId: '0' },
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
      () => ensureClawRouterBrowserProductionEnv({
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
    assert.equal(
      existsSync(path.join(applicationRoot, '.env.production.bootstrap.local')),
      false,
    );
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_CONFIG_PROFILE, 'prod');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_ENVIRONMENT, 'production');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE, 'standalone');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_RUNTIME_TARGET, 'browser');
    for (const retiredKey of RETIRED_CLAW_LIFECYCLE_ENV_KEYS) {
      assert.equal(result.mergedEnv[retiredKey], undefined);
    }
    assert.equal(result.mergedEnv.PORTAL_PUBLIC_API_BASE_URL, undefined);
    assert.doesNotMatch(written, /^PORTAL_/mu);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('ensureClawRouterReleaseEnv migrates legacy private edge keys to canonical names', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'claw-router-release-edge-env-'));

  try {
    writeFileSync(
      path.join(tempRoot, 'sdkwork.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-clawrouter' },
        backend: { tenantId: '100001', organizationId: '0' },
      }),
      'utf8',
    );
    writeFileSync(
      path.join(tempRoot, '.env.release.example'),
      [
        'PORTAL_PUBLIC_SDK_BASE_URL="/"',
        'PORTAL_PUBLIC_API_BASE_URL="/v1"',
        '',
      ].join('\n'),
      'utf8',
    );
    writeFileSync(
      path.join(tempRoot, '.env.release'),
      [
        'PORTAL_PUBLIC_SDK_BASE_URL="/"',
        'PORTAL_TOOL_API_RATE_LIMIT_REQUESTS=240',
        'PORTAL_CSP_CONNECT_SRC=https://legacy.example.com',
        '',
      ].join('\n'),
      'utf8',
    );

    const result = ensureClawRouterReleaseEnv({
      workspaceRoot: tempRoot,
    });

    assert.equal(result.mergedEnv.SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS, '240');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC, 'https://legacy.example.com');
    assert.equal(result.mergedEnv.PORTAL_TOOL_API_RATE_LIMIT_REQUESTS, undefined);
    assert.equal(result.mergedEnv.PORTAL_CSP_CONNECT_SRC, undefined);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('ensureClawRouterReleaseEnv replaces retired lifecycle keys and the release profile alias', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'claw-router-release-backfill-'));
  const profileFilePath = path.join(tempRoot, '.env.release');

  try {
    writeFileSync(
      path.join(tempRoot, 'sdkwork.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-clawrouter' },
        backend: { tenantId: '100001', organizationId: '0' },
      }),
      'utf8',
    );
    writeFileSync(
      path.join(tempRoot, '.env.release.example'),
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
        'SDKWORK_CLAW_ROUTER_CONFIG_PROFILE=release',
        'SDKWORK_CLAW_ROUTER_ENVIRONMENT=production',
        'SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE=standalone',
        'SDKWORK_CLAW_ROUTER_RUNTIME_TARGET=server',
        'SDKWORK_CLAW_CONFIG_PROFILE=release',
        'SDKWORK_CLAW_ENVIRONMENT=development',
        'SDKWORK_CLAW_DEPLOYMENT_PROFILE=cloud',
        'SDKWORK_CLAW_RUNTIME_TARGET=browser',
        'SDKWORK_ACCESS_TOKEN=' + COMPLIANT_BOOTSTRAP_ACCESS_TOKEN,
        'PORTAL_PUBLIC_SDK_BASE_URL=/',
        'PORTAL_PUBLIC_API_BASE_URL=/v1',
        'PORTAL_PUBLIC_BACKEND_API_BASE_URL=/backend/v3/api',
        'PORTAL_PUBLIC_TOOL_API_ENABLED=false',
        'SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS=120',
        'SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS=60',
        '',
      ].join('\n'),
      'utf8',
    );

    const { result, writtenContents } = captureProfileWrites(
      profileFilePath,
      () => ensureClawRouterReleaseEnv({
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
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_CONFIG_PROFILE, 'prod');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_ENVIRONMENT, 'production');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE, 'standalone');
    assert.equal(result.mergedEnv.SDKWORK_CLAW_ROUTER_RUNTIME_TARGET, 'server');
    for (const retiredKey of RETIRED_CLAW_LIFECYCLE_ENV_KEYS) {
      assert.equal(result.mergedEnv[retiredKey], undefined);
    }
    for (const key of CLAW_ROUTER_RELEASE_ENV_KEY_ORDER) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(result.mergedEnv, key),
        `expected merged env to include ${key}`,
      );
    }

    const writtenRecord = loadEnvFile(profileFilePath);
    assert.equal(writtenRecord.SDKWORK_CLAW_ROUTER_CONFIG_PROFILE, 'prod');
    for (const retiredKey of RETIRED_CLAW_LIFECYCLE_ENV_KEYS) {
      assert.equal(writtenRecord[retiredKey], undefined);
    }
    for (const key of CLAW_ROUTER_RELEASE_ENV_KEY_ORDER) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(writtenRecord, key),
        `expected written profile to include ${key}`,
      );
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('ensureClawRouterReleaseEnv writes comment-prefixed edge key documentation', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'claw-router-release-format-'));

  try {
    writeFileSync(
      path.join(tempRoot, 'sdkwork.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-clawrouter' },
        backend: { tenantId: '100001', organizationId: '0' },
      }),
      'utf8',
    );
    writeFileSync(
      path.join(tempRoot, '.env.release.example'),
      [
        'PORTAL_PUBLIC_SDK_BASE_URL="/"',
        'PORTAL_PUBLIC_API_BASE_URL="/v1"',
        '',
      ].join('\n'),
      'utf8',
    );

    ensureClawRouterReleaseEnv({
      workspaceRoot: tempRoot,
    });

    const written = readFileSync(path.join(tempRoot, '.env.release'), 'utf8');
    assert.match(written, /^# Server-side rate limit/m);
    assert.doesNotMatch(written, /^Server-side rate limit/m);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('signLocalAppSessionAccessToken emits v2 access claim tokens', () => {
  const token = signLocalAppSessionAccessToken({
    environment: 'development',
    appSessionSecret: 'sdkwork-clawrouter-local-dev-secret-20260507',
    nowUnixSeconds: 1_800_000_000,
  });

  assert.match(token, /^v2\.[A-Za-z0-9_-]+\.[0-9a-f]{64}$/u);

  const encodedPayload = token.split('.')[1];
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  assert.equal(payload.token_version, 1);
  assert.equal(payload.tenant_id, '100001');
  assert.equal(payload.app_id, 'sdkwork-clawrouter');
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
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'claw-router-profile-cli-'));
  const applicationRoot = path.join(tempRoot, 'apps', 'sdkwork-clawrouter-pc');

  try {
    mkdirSync(applicationRoot, { recursive: true });
    writeFileSync(
      path.join(tempRoot, 'sdkwork.app.config.json'),
      JSON.stringify({
        app: { key: 'sdkwork-clawrouter' },
        backend: { tenantId: '100001', organizationId: '0' },
      }),
      'utf8',
    );

    const cliResult = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL('./claw-router-application-env.mjs', import.meta.url)),
        '--workspace-root',
        tempRoot,
        '--profile',
        'unsupported-profile',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          SDKWORK_CLAW_APP_SESSION_SECRET: 'too-short',
        },
      },
    );

    assert.notEqual(cliResult.status, 0);
    assert.match(cliResult.stderr, /unsupported profile/u);
    assert.equal(
      existsSync(path.join(applicationRoot, '.env.development.bootstrap.local')),
      false,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('ensureClawRouterBrowserDevelopmentEnv refreshes stale bootstrap access tokens', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'claw-router-env-'));
  const appRoot = path.join(tempRoot, 'apps', 'sdkwork-clawrouter-pc');
  mkdirSync(appRoot, { recursive: true });
  writeFileSync(
    path.join(tempRoot, 'sdkwork.app.config.json'),
    JSON.stringify({
      app: { key: 'sdkwork-clawrouter' },
      backend: { tenantId: '100001', organizationId: '0' },
    }),
    'utf8',
  );
  const staleToken = 'v2.eyJ0b2tlbktpbmQiOiJhY2Nlc3MiLCJ0ZW5hbnRJZCI6MTAwMDAxfQ.stale';
  writeFileSync(
    path.join(appRoot, '.env.development'),
    `SDKWORK_ACCESS_TOKEN=${staleToken}\n`,
    'utf8',
  );

  try {
    const result = ensureClawRouterBrowserDevelopmentEnv({
      workspaceRoot: tempRoot,
      applicationRoot: appRoot,
    });
    const bootstrapLocal = loadEnvFile(path.join(appRoot, '.env.development.bootstrap.local'));
    assert.notEqual(bootstrapLocal.SDKWORK_ACCESS_TOKEN, staleToken);
    assert.match(bootstrapLocal.SDKWORK_ACCESS_TOKEN, /^v2\./u);
    const encodedPayload = bootstrapLocal.SDKWORK_ACCESS_TOKEN.split('.')[1];
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    assert.equal(payload.token_version, 1);
    assert.equal(result.mergedEnv.SDKWORK_ACCESS_TOKEN, '');
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('resolveApplicationEnvPaths selects browser app root for Vite profiles', () => {
  const paths = resolveApplicationEnvPaths({
    workspaceRoot: '/repo',
    applicationRoot: '/repo/apps/sdkwork-clawrouter-pc',
    configProfile: 'development',
    runtimeTarget: 'browser',
  });

  assert.ok(
    paths.profileFilePath.endsWith(path.join('apps', 'sdkwork-clawrouter-pc', '.env.development')),
  );
});
