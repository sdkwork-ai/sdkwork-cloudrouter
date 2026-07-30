import assert from 'node:assert/strict';
import test from 'node:test';

import { CLAW_ROUTER_RELEASE_EDGE_ENV_KEY_ORDER } from './lib/claw-router-edge-env-contract.mjs';
import { RELEASE_ENVIRONMENT_CONTRACT } from './release-environment-contract.mjs';
import { releaseEnvironmentIssues } from './release-preflight.mjs';

const validReleaseEnv = Object.freeze({
  SDKWORK_DATABASE_URL: 'postgres://release:secret@db.example.com:5432/claw',
  PORTAL_PUBLIC_API_BASE_URL: 'https://tenant.example.com/v1',
  PORTAL_PUBLIC_APP_API_BASE_URL: '/app/v3/api',
  PORTAL_PUBLIC_BACKEND_API_BASE_URL: '/backend/v3/api',
  PORTAL_PUBLIC_TOOL_API_ENABLED: 'false',
  SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS: '120',
  SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS: '60',
});

test('release environment contract v4 documents optional edge private env keys', () => {
  assert.equal(RELEASE_ENVIRONMENT_CONTRACT.version, 4);
  for (const key of CLAW_ROUTER_RELEASE_EDGE_ENV_KEY_ORDER) {
    assert.ok(
      RELEASE_ENVIRONMENT_CONTRACT.optionalEdgePrivateEnv.includes(key),
      `optionalEdgePrivateEnv must include ${key}`,
    );
  }
});

test('releaseEnvironmentIssues accepts canonical edge defaults', () => {
  assert.deepEqual(releaseEnvironmentIssues(validReleaseEnv), []);
});

test('releaseEnvironmentIssues rejects invalid edge rate limit values', () => {
  const issues = releaseEnvironmentIssues({
    ...validReleaseEnv,
    SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS: '-1',
  });
  assert.ok(
    issues.some((issue) => issue.includes('SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS')),
  );
});
