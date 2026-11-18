import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { surfaceApplicationTokenEnvName } from '../../sdkwork-specs/tools/app-access-token.mjs';

import { checkDeployApplicationAnchor } from './check-deploy-application-anchor.mjs';
import {
  CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV,
  CLOUD_ROUTER_PENDING_DEPLOY_APPLICATION_ID,
} from './lib/cloud-router-browser-env-contract.mjs';

const PROFILE_ID = 'standalone.development';
const ANCHOR_ENV = CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV;

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

function miniProgramProfilePath(rootRelative, profileId) {
  return path.join(
    rootRelative,
    'config',
    'mini-program',
    `runtime-env.${profileId}.json`,
  );
}

function surfaceAnchorVariable(surfaceId) {
  return surfaceApplicationTokenEnvName(ANCHOR_ENV, surfaceId);
}

/**
 * Write a materialization declaration plus one token carrier per listed profile.
 * @param surfaces - `{ id, root, tokens: { [profileId]: appId } }` entries.
 * @returns the temporary repository root.
 */
function createMultiSurfaceRoot(surfaces) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cloudrouter-anchor-gate-'));
  writeFixture(root, 'etc/client-env.materialization.json', JSON.stringify({
    schemaVersion: 1,
    kind: 'sdkwork.client-env-materialization',
    surfaces: surfaces.map((surface) => ({
      id: surface.id,
      root: surface.root,
      format: 'mini-program',
      runtimeTarget: 'mini-program',
      accessToken: {
        appIdEnv: ANCHOR_ENV,
        tenantId: '100001',
        organizationId: '0',
        permissionScope: ['iam:self'],
      },
    })),
  }, null, 2));
  for (const surface of surfaces) {
    for (const [profileId, appId] of Object.entries(surface.tokens ?? {})) {
      writeFixture(
        root,
        miniProgramProfilePath(surface.root, profileId),
        JSON.stringify({ SDKWORK_ACCESS_TOKEN: encodeToken(appId) }, null, 2),
      );
    }
  }
  return root;
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

test('every surface of a multi-surface repository uses its own anchor', () => {
  const pcVariable = surfaceAnchorVariable('demo-pc');
  const h5Variable = surfaceAnchorVariable('demo_h5');
  const root = createMultiSurfaceRoot([
    { id: 'demo-pc', root: 'apps/demo-pc', tokens: { [PROFILE_ID]: 'anchor-pc' } },
    { id: 'demo_h5', root: 'apps/demo-h5', tokens: { [PROFILE_ID]: 'anchor-h5' } },
  ]);
  try {
    const result = checkDeployApplicationAnchor({
      root,
      profileId: PROFILE_ID,
      env: { [pcVariable]: 'anchor-pc', [h5Variable]: 'anchor-h5' },
    });
    assert.equal(result.skipped, false);
    assert.equal(result.checked.length, 2);
    assert.deepEqual(
      result.surfaceAnchors.map((surface) => [surface.surfaceId, surface.anchor]),
      [['demo-pc', 'anchor-pc'], ['demo_h5', 'anchor-h5']],
    );
    assert.deepEqual(
      result.surfaces.map((group) => group.surfaceAnchorEnvName),
      [pcVariable, h5Variable],
    );
    // The variable names are the materializer's canonical derivation, not a
    // gate-local guess.
    assert.equal(pcVariable, `${ANCHOR_ENV}_DEMO_PC`);
    assert.equal(h5Variable, `${ANCHOR_ENV}_DEMO_H5`);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('a surface id with non-alphanumerics derives the materializer anchor variable', () => {
  const surfaceId = 'SdkWork-Demo.PC';
  const variable = surfaceAnchorVariable(surfaceId);
  assert.equal(variable, `${ANCHOR_ENV}_SDKWORK_DEMO_PC`);
  const root = createMultiSurfaceRoot([
    { id: surfaceId, root: 'apps/demo', tokens: { [PROFILE_ID]: 'anchor-normalized' } },
  ]);
  try {
    const result = checkDeployApplicationAnchor({
      root,
      profileId: PROFILE_ID,
      env: { [variable]: 'anchor-normalized' },
    });
    assert.equal(result.checked.length, 1);
    assert.equal(result.surfaces[0].surfaceAnchorEnvName, variable);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('a surface token carrying another surface anchor fails and names the surface', () => {
  const pcVariable = surfaceAnchorVariable('demo-pc');
  const h5Variable = surfaceAnchorVariable('demo_h5');
  const root = createMultiSurfaceRoot([
    { id: 'demo-pc', root: 'apps/demo-pc', tokens: { [PROFILE_ID]: 'anchor-pc' } },
    { id: 'demo_h5', root: 'apps/demo-h5', tokens: { [PROFILE_ID]: 'anchor-pc' } },
  ]);
  try {
    assert.throws(
      () => checkDeployApplicationAnchor({
        root,
        profileId: PROFILE_ID,
        env: { [pcVariable]: 'anchor-pc', [h5Variable]: 'anchor-h5' },
      }),
      (error) => {
        assert.match(error.message, /demo_h5/u);
        assert.match(error.message, /app_id, aud must be anchor-h5/u);
        assert.match(error.message, new RegExp(`${h5Variable}=anchor-h5`, 'u'));
        assert.match(error.message, /Deploy application anchor check failed \(1\)/u);
        return true;
      },
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('a surface without its own variable falls back to the repository-level anchor', () => {
  const pcVariable = surfaceAnchorVariable('demo-pc');
  const root = createMultiSurfaceRoot([
    { id: 'demo-pc', root: 'apps/demo-pc', tokens: { [PROFILE_ID]: 'repo-anchor' } },
    { id: 'demo_h5', root: 'apps/demo-h5', tokens: { [PROFILE_ID]: 'repo-anchor' } },
  ]);
  try {
    const result = checkDeployApplicationAnchor({
      root,
      profileId: PROFILE_ID,
      env: { [ANCHOR_ENV]: 'repo-anchor' },
    });
    assert.equal(result.checked.length, 2);
    assert.deepEqual(
      result.surfaceAnchors.map((surface) => surface.anchorVariable),
      [ANCHOR_ENV, ANCHOR_ENV],
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }

  // One surface may keep its own anchor while the other one still relies on the
  // repository-level fallback.
  const mixedRoot = createMultiSurfaceRoot([
    { id: 'demo-pc', root: 'apps/demo-pc', tokens: { [PROFILE_ID]: 'anchor-pc' } },
    { id: 'demo_h5', root: 'apps/demo-h5', tokens: { [PROFILE_ID]: 'repo-anchor' } },
  ]);
  try {
    const mixed = checkDeployApplicationAnchor({
      root: mixedRoot,
      profileId: PROFILE_ID,
      env: { [pcVariable]: 'anchor-pc', [ANCHOR_ENV]: 'repo-anchor' },
    });
    assert.equal(mixed.checked.length, 2);
    assert.deepEqual(
      mixed.surfaceAnchors.map((surface) => [surface.surfaceId, surface.anchorVariable]),
      [['demo-pc', pcVariable], ['demo_h5', ANCHOR_ENV]],
    );
  } finally {
    rmSync(mixedRoot, { force: true, recursive: true });
  }
});

test('a recorded per-surface anchor feeds the check without an exported variable', () => {
  const pcVariable = surfaceAnchorVariable('demo-pc');
  const h5Variable = surfaceAnchorVariable('demo_h5');
  const root = createMultiSurfaceRoot([
    { id: 'demo-pc', root: 'apps/demo-pc', tokens: { [PROFILE_ID]: 'anchor-pc' } },
    { id: 'demo_h5', root: 'apps/demo-h5', tokens: { [PROFILE_ID]: 'anchor-h5' } },
  ]);
  try {
    // The resolved topology profile (what the materializer reads).
    writeFixture(root, `etc/topology/${PROFILE_ID}.env`, `${pcVariable}=anchor-pc\n`);
    // The authored override layer a per-surface registration writes.
    writeFixture(root, `etc/topology/overrides/${PROFILE_ID}.env`, `${h5Variable}=anchor-h5\n`);

    const result = checkDeployApplicationAnchor({ root, profileId: PROFILE_ID, env: {} });
    assert.equal(result.skipped, false);
    assert.equal(result.checked.length, 2);
    assert.deepEqual(
      result.surfaceAnchors.map((surface) => surface.anchorSource),
      [`etc/topology/${PROFILE_ID}.env`, `etc/topology/overrides/${PROFILE_ID}.env`],
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('a repository-root .env.<environment> record feeds the check', () => {
  const pcVariable = surfaceAnchorVariable('demo-pc');
  const root = createMultiSurfaceRoot([
    { id: 'demo-pc', root: 'apps/demo-pc', tokens: { [PROFILE_ID]: 'anchor-root-env' } },
  ]);
  try {
    writeFixture(root, '.env.development', `${pcVariable}=anchor-root-env\n`);
    const result = checkDeployApplicationAnchor({ root, profileId: PROFILE_ID, env: {} });
    assert.equal(result.checked.length, 1);
    assert.equal(result.surfaceAnchors[0].anchorSource, '.env.development');
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('the process environment wins over a recorded anchor', () => {
  const pcVariable = surfaceAnchorVariable('demo-pc');
  const root = createMultiSurfaceRoot([
    { id: 'demo-pc', root: 'apps/demo-pc', tokens: { [PROFILE_ID]: 'anchor-from-env' } },
  ]);
  try {
    writeFixture(root, `etc/topology/${PROFILE_ID}.env`, `${pcVariable}=anchor-recorded\n`);
    const result = checkDeployApplicationAnchor({
      root,
      profileId: PROFILE_ID,
      env: { [pcVariable]: 'anchor-from-env' },
    });
    assert.equal(result.checked.length, 1);
    assert.equal(result.surfaceAnchors[0].anchorSource, 'environment');
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('--surface limits the verified surfaces and refuses unknown ids', () => {
  const pcVariable = surfaceAnchorVariable('demo-pc');
  const h5Variable = surfaceAnchorVariable('demo_h5');
  const root = createMultiSurfaceRoot([
    { id: 'demo-pc', root: 'apps/demo-pc', tokens: { [PROFILE_ID]: 'anchor-pc' } },
    { id: 'demo-h5', root: 'apps/demo-h5', tokens: { [PROFILE_ID]: 'anchor-wrong' } },
  ]);
  try {
    assert.throws(
      () => checkDeployApplicationAnchor({
        root,
        profileId: PROFILE_ID,
        env: { [pcVariable]: 'anchor-pc', [h5Variable]: 'anchor-h5' },
      }),
      /demo-h5/u,
    );
    const result = checkDeployApplicationAnchor({
      root,
      profileId: PROFILE_ID,
      surfaceIds: ['demo-pc'],
      env: { [pcVariable]: 'anchor-pc', [h5Variable]: 'anchor-h5' },
    });
    assert.equal(result.checked.length, 1);
    assert.deepEqual(result.surfaces.map((group) => group.surfaceId), ['demo-pc']);

    assert.throws(
      () => checkDeployApplicationAnchor({
        root,
        profileId: PROFILE_ID,
        surfaceIds: ['missing-surface'],
        env: { [pcVariable]: 'anchor-pc' },
      }),
      /--surface missing-surface is not declared .*declared surface\(s\): demo-pc, demo-h5/u,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('placeholders are detected per surface and refused when materialization is required', () => {
  const pcVariable = surfaceAnchorVariable('demo-pc');
  const h5Variable = surfaceAnchorVariable('demo_h5');
  const root = createMultiSurfaceRoot([
    {
      id: 'demo-pc',
      root: 'apps/demo-pc',
      tokens: { [PROFILE_ID]: CLOUD_ROUTER_PENDING_DEPLOY_APPLICATION_ID },
    },
    {
      id: 'demo_h5',
      root: 'apps/demo-h5',
      tokens: { [PROFILE_ID]: 'anchor-h5' },
    },
  ]);
  try {
    const result = checkDeployApplicationAnchor({
      root,
      profileId: PROFILE_ID,
      env: { [pcVariable]: 'anchor-pc', [h5Variable]: 'anchor-h5' },
    });
    assert.equal(result.pending.length, 1);
    assert.equal(result.checked.length, 1);
    assert.deepEqual(
      result.surfaceAnchors.map((surface) => [surface.surfaceId, surface.pending]),
      [['demo-pc', 1], ['demo_h5', 0]],
    );
    assert.throws(
      () => checkDeployApplicationAnchor({
        root,
        profileId: PROFILE_ID,
        env: { [pcVariable]: 'anchor-pc', [h5Variable]: 'anchor-h5' },
        requireMaterialized: true,
      }),
      /needs materialization: 1 committed profile file/u,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('require-materialized refuses a surface with no resolvable anchor', () => {
  const pcVariable = surfaceAnchorVariable('demo-pc');
  const root = createMultiSurfaceRoot([
    { id: 'demo-pc', root: 'apps/demo-pc', tokens: { [PROFILE_ID]: 'anchor-pc' } },
    { id: 'demo-h5', root: 'apps/demo-h5', tokens: { [PROFILE_ID]: 'anchor-h5' } },
  ]);
  try {
    // demo-pc has an anchor, demo-h5 does not: the tokens of demo-h5 are read
    // but cannot be proven, which packaging must refuse.
    assert.throws(
      () => checkDeployApplicationAnchor({
        root,
        profileId: PROFILE_ID,
        env: { [pcVariable]: 'anchor-pc' },
        requireMaterialized: true,
      }),
      /needs anchor: demo-h5 \(SDKWORK_DEPLOY_APPLICATION_ID_DEMO_H5\)/u,
    );
    const advisory = checkDeployApplicationAnchor({
      root,
      profileId: PROFILE_ID,
      env: { [pcVariable]: 'anchor-pc' },
    });
    assert.equal(advisory.checked.length, 1);
    assert.deepEqual(advisory.surfaces[1].unverified, [
      `apps/demo-h5/config/mini-program/runtime-env.${PROFILE_ID}.json`,
    ]);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
