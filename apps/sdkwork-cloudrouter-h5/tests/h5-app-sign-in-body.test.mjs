/**
 * Legacy credential-entry body helper retained for source stability.
 *
 * The live H5 sign-in now renders the shared `@sdkwork/iam-h5-auth` surface and
 * the IAM service owns its request body; this pure helper is no longer wired
 * into the app session.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildAppSignInBody } from '../src/app-auth/appSignInBody.ts';

test('posts a password grant with the typed address as the identity', () => {
  const body = buildAppSignInBody({ email: '  user@example.com  ', password: 'secret' });
  assert.equal(body.grantType, 'password');
  assert.equal(body.email, 'user@example.com');
  assert.equal(body.account, 'user@example.com');
  assert.equal(body.password, 'secret');
});
