import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { checkDeployApplicationAnchor } from './check-deploy-application-anchor.mjs';
import {
  CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV,
  CLOUD_ROUTER_PENDING_DEPLOY_APPLICATION_ID,
} from './lib/cloud-router-browser-env-contract.mjs';

const PROFILE_ID = 'standalone.development';

function writeFixture(root, relativePath, contents) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents, 'utf8');
}

function encodeToken(appId) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', kid: 'public-app-token', typ: 'JWT' }),
    encode({
      app_id: appId,
      aud: appId,
      deployment_mode: 'private',
      deployment_profile: 'standalone',
      environment: 'development',
      exp: 4102444800,
      iat: 1767225600,
      iss: 'sdkwork-iam-public',
      login_scope: 'TENANT',
      organization_id: '0',
      permission_scope: ['iam:self'],
      runtime_target: 'mini-program',
      session_id: `bootstrap-public-${appId}-${PROFILE_ID}`,
      tenant_id: '100001',
      token_class: 'application',
      token_type: 'access',
      token_version: 1,
      user_id: '0',
    }),
    'public',
  ].join('.');
}

function createRoot({ accessToken, tokenAppId }) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cloudrouter-anchor-gate-'));
  writeFixture(root, 'etc/client-env.materialization.json', JSON.stringify({
    schemaVersion: 1,
    kind: 'sdkwork.client-env-materialization',
    surfaces: [{
      id: 'demo-app',
      root: 'apps/demo',
      format: 'mini-program',
      runtimeTarget: 'mini-program',
      accessToken: {
        ...accessToken,
        tenantId: '100001',
        organizationId: '0',
        permissionScope: ['iam:self'],
      },
    }],
  }, null, 2));
  writeFixture(
    root,
    `apps/demo/config/mini-program/runtime-env.${PROFILE_ID}.json`,
    JSON.stringify({ SDKWORK_ACCESS_TOKEN: encodeToken(tokenAppId ?? 'app-anchor-1') }, null, 2),
  );
  return root;
}

test('reports a readable skip when the deploy anchor is not configured', () => {
  const root = createRoot({
    accessToken: { appIdEnv: CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV },
  });
  try {
    const result = checkDeployApplicationAnchor({ root, profileId: PROFILE_ID, env: {} });
    assert.equal(result.skipped, true);
    assert.match(result.reason, new RegExp(`skipped: ${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV} not set`, 'u'));
    assert.throws(
      () => checkDeployApplicationAnchor({
        root,
        profileId: PROFILE_ID,
        env: {},
        requireMaterialized: true,
      }),
      /is required to verify packaging/u,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('a hardcoded accessToken.appId fails even when the anchor is unavailable', () => {
  const root = createRoot({ accessToken: { appId: 'sdkwork-cloudrouter' } });
  try {
    assert.throws(
      () => checkDeployApplicationAnchor({ root, profileId: PROFILE_ID, env: {} }),
      /must declare accessToken\.appIdEnv=SDKWORK_DEPLOY_APPLICATION_ID/u,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('an anchored token passes and is reported as verified', () => {
  const root = createRoot({
    accessToken: { appIdEnv: CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV },
    tokenAppId: 'app-anchor-1',
  });
  try {
    const result = checkDeployApplicationAnchor({
      root,
      profileId: PROFILE_ID,
      env: { [CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV]: 'app-anchor-1' },
    });
    assert.equal(result.checked.length, 1);
    assert.equal(result.pending.length, 0);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('the pending placeholder is advisory unless materialization is required', () => {
  const root = createRoot({
    accessToken: { appIdEnv: CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV },
    tokenAppId: CLOUD_ROUTER_PENDING_DEPLOY_APPLICATION_ID,
  });
  try {
    const result = checkDeployApplicationAnchor({
      root,
      profileId: PROFILE_ID,
      env: { [CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV]: 'app-anchor-1' },
    });
    assert.equal(result.pending.length, 1);
    assert.throws(
      () => checkDeployApplicationAnchor({
        root,
        profileId: PROFILE_ID,
        env: { [CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV]: 'app-anchor-1' },
        requireMaterialized: true,
      }),
      /needs materialization/u,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('a token with the retired or any other app id fails', () => {
  const root = createRoot({
    accessToken: { appIdEnv: CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV },
    tokenAppId: 'sdkwork-cloudrouter',
  });
  try {
    assert.throws(
      () => checkDeployApplicationAnchor({
        root,
        profileId: PROFILE_ID,
        env: { [CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV]: 'app-anchor-1' },
      }),
      /app_id, aud must be app-anchor-1/u,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('a declaration sourced from a non-anchor variable fails', () => {
  const root = createRoot({ accessToken: { appIdEnv: 'SOME_OTHER_APP_ID' } });
  try {
    assert.throws(
      () => checkDeployApplicationAnchor({
        root,
        profileId: PROFILE_ID,
        env: { SOME_OTHER_APP_ID: 'app-anchor-1' },
      }),
      /accessToken\.appIdEnv must be SDKWORK_DEPLOY_APPLICATION_ID/u,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
