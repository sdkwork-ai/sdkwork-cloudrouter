/**
 * The H5 hosted login posts a credential-entry body the IAM app-api accepts:
 * the typed address travels as `email` (which the server resolves as the login
 * identity) and `grantType` is explicit, so the sign-in does not depend on the
 * server's default grant.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { buildAppSignInBody } from '../src/app-auth/appSignInBody.ts';

test('posts a password grant with the typed address as the identity', () => {
  const body = buildAppSignInBody({ email: '  user@example.com  ', password: 'secret' });
  assert.equal(body.grantType, 'password');
  assert.equal(body.email, 'user@example.com');
  assert.equal(body.account, 'user@example.com');
  assert.equal(body.password, 'secret');
});

test('the H5 session request uses the shared body builder', () => {
  const source = readFileSync(
    new URL('../src/app-auth/appSession.ts', import.meta.url),
    'utf8',
  );
  assert.match(source, /buildAppSignInBody\(credentials\)/u);
});
