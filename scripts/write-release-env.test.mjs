import assert from 'node:assert/strict';
import test from 'node:test';

import { CLAW_ROUTER_RELEASE_ENV_KEY_ORDER } from './dev/claw-router-application-env.mjs';
import { buildReleaseEnvFilePlan } from './write-release-env.mjs';

const validReleaseEnv = Object.freeze({
  SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL: 'postgres://release:secret@db.example.com:5432/claw',
  PORTAL_PUBLIC_API_BASE_URL: 'https://tenant.example.com/v1',
  PORTAL_PUBLIC_OPEN_API_BASE_URL: 'https://open.tenant.example.com/v1',
  PORTAL_PUBLIC_APP_API_BASE_URL: '/app/v3/api',
  PORTAL_PUBLIC_BACKEND_API_BASE_URL: '/backend/v3/api',
  PORTAL_PUBLIC_TOOL_API_ENABLED: 'false',
});

test('buildReleaseEnvFilePlan writes every canonical release key including empty values', () => {
  const plan = buildReleaseEnvFilePlan({
    env: validReleaseEnv,
    outputPath: '.env.release',
    overwrite: false,
    existingFile: false,
  });

  assert.equal(
    plan.safeSummary,
    `release env file would be written with ${CLAW_ROUTER_RELEASE_ENV_KEY_ORDER.length} release profile variables`,
  );
  for (const key of CLAW_ROUTER_RELEASE_ENV_KEY_ORDER) {
    assert.match(plan.content, new RegExp(`^${key}=`, 'mu'), `expected ${key} in release env output`);
  }
  assert.match(plan.content, /^SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC=""/mu);
  assert.match(plan.content, /^SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT=""/mu);
  assert.ok(!plan.safeSummary.includes('secret'));
});

test('buildReleaseEnvFilePlan never persists SDKWORK_ACCESS_TOKEN from process env', () => {
  const plan = buildReleaseEnvFilePlan({
    env: {
      ...validReleaseEnv,
      SDKWORK_ACCESS_TOKEN: 'test-only-input-token',
    },
    outputPath: '.env.release',
    overwrite: false,
    existingFile: false,
  });

  const writtenKeys = plan.content
    .split(/\r?\n/u)
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.slice(0, line.indexOf('=')));
  assert.equal(writtenKeys.includes('SDKWORK_ACCESS_TOKEN'), false);
});

test('buildReleaseEnvFilePlan rejects invalid edge rate limit values', () => {
  assert.throws(
    () => buildReleaseEnvFilePlan({
      env: {
        ...validReleaseEnv,
        SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS: '0',
      },
      outputPath: '.env.release',
      overwrite: true,
      existingFile: false,
    }),
    /SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS must be a positive integer/u,
  );
});

test('buildReleaseEnvFilePlan rejects invalid SDK generator base URLs', () => {
  assert.throws(
    () => buildReleaseEnvFilePlan({
      env: {
        ...validReleaseEnv,
        SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL: 'javascript:alert(1)',
      },
      outputPath: '.env.release',
      overwrite: true,
      existingFile: false,
    }),
    /SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL must be an HTTP or HTTPS URL/u,
  );
});
