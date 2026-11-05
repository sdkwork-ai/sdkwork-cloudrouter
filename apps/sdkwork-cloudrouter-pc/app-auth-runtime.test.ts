// Hosted app sign-in entry: request contract, plan selection, and the
// hand-off exemption the portal auth guard relies on.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  APP_AUTHORIZE_ALIAS_PATH,
  APP_AUTHORIZE_LAUNCH_PATH,
  APP_AUTHORIZE_PATH,
  APP_AUTHORIZE_PATHS,
  APP_AUTHORIZE_VERSIONLESS_PATH,
  isAppCallbackRedirectUri,
  parseAppAuthorizeRequest,
  planAppAuthorizeEntry,
} from './src/app-auth/appAuthorizeEntry.ts';
import {
  hasPortalOAuthSignInState,
  isPortalAppHandoffPath,
  isPortalAppSignInHandoff,
  isPortalAuthRoute,
} from './packages/sdkwork-cloudroutes-pc-commons/src/portal-auth.ts';

/** A complete authorization-code request from a native application. */
function authorizeSearch(overrides: Record<string, string | undefined> = {}): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'birdcoder',
    redirect_uri: 'birdcoder://auth/callback',
    scope: 'openid profile offline_access',
    state: 'state-token',
    code_challenge: 'z'.repeat(43),
    code_challenge_method: 'S256',
    ...overrides,
  });
  return `?${params.toString()}`;
}

test('the hosted entry accepts a complete S256 authorization-code request', () => {
  const parsed = parseAppAuthorizeRequest(new URLSearchParams(authorizeSearch().slice(1)));
  assert.equal(parsed.kind, 'valid');
  assert.deepEqual(parsed.kind === 'valid' ? parsed.request : null, {
    clientId: 'birdcoder',
    redirectUri: 'birdcoder://auth/callback',
    scope: 'openid profile offline_access',
    state: 'state-token',
    codeChallenge: 'z'.repeat(43),
  });
});

test('the request contract rejects every weakening of the hand-off', () => {
  const cases: Array<[Record<string, string | undefined>, string]> = [
    [{ response_type: 'token' }, 'unsupported-response-type'],
    [{ client_id: 'Birdcoder' }, 'invalid-client-id'],
    [{ redirect_uri: 'https://evil.example.com/cb' }, 'invalid-redirect-uri'],
    [{ redirect_uri: 'javascript:alert(1)' }, 'invalid-redirect-uri'],
    [{ redirect_uri: 'birdcoder://auth/callback?next=https://evil.example.com' }, 'invalid-redirect-uri'],
    [{ state: 's'.repeat(513) }, 'invalid-state'],
    [{ code_challenge_method: 'plain' }, 'unsupported-challenge-method'],
    [{ code_challenge: 'too-short' }, 'invalid-code-challenge'],
    [{ scope: 'profile offline_access' }, 'invalid-scope'],
    [{ scope: 'openid admin!' }, 'invalid-scope'],
  ];
  for (const [overrides, problem] of cases) {
    const parsed = parseAppAuthorizeRequest(new URLSearchParams(authorizeSearch(overrides).slice(1)));
    assert.deepEqual(parsed, { kind: 'invalid', problem }, JSON.stringify(overrides));
  }
});

test('missing required parameters are reported before any other problem', () => {
  const parsed = parseAppAuthorizeRequest(new URLSearchParams('response_type=code&client_id=birdcoder'));
  assert.deepEqual(parsed, { kind: 'invalid', problem: 'missing-parameter' });
});

test('redirect URIs admit app schemes and loopback callbacks only', () => {
  assert.equal(isAppCallbackRedirectUri('birdcoder://auth/callback'), true);
  assert.equal(isAppCallbackRedirectUri('http://127.0.0.1:53211/auth/callback'), true);
  assert.equal(isAppCallbackRedirectUri('http://localhost:53211/auth/callback'), true);
  assert.equal(isAppCallbackRedirectUri('https://app.example.com/auth/callback'), false);
  assert.equal(isAppCallbackRedirectUri('http://app.example.com/auth/callback'), false);
  assert.equal(isAppCallbackRedirectUri('birdcoder:auth/callback'), false);
  assert.equal(isAppCallbackRedirectUri('birdcoder://user:secret@auth/callback'), false);
});

test('a full request creates the pending authorization state on the same page', () => {
  const plan = planAppAuthorizeEntry(authorizeSearch());
  if (plan.kind !== 'create') assert.fail(`expected a create plan, got ${plan.kind}`);
  assert.deepEqual(plan.request, {
    clientId: 'birdcoder',
    redirectUri: 'birdcoder://auth/callback',
    scope: 'openid profile offline_access',
    state: 'state-token',
    codeChallenge: 'z'.repeat(43),
  });
});

test('the authorization state the IAM issued renders the hosted login in place', () => {
  const search = '?oauthAuthorizationStateId=oauth_state_123&redirect=ignored';
  assert.deepEqual(planAppAuthorizeEntry(search), {
    kind: 'hosted',
    stateId: 'oauth_state_123',
  });
});

test('a real application-produced authorize URL from the platform origin is accepted', () => {
  // Captured from a live BirdCoder desktop browser login: the exact request the
  // app hands the system browser must pass the platform page unchanged.
  const realSearch = '?response_type=code&client_id=birdcoder'
    + '&redirect_uri=birdcoder%3A%2F%2Fauth%2Fcallback'
    + '&scope=openid+profile+offline_access'
    + '&state=LjERtcYSxP1ANSue1nnycFnGyG9NWmqe'
    + '&code_challenge=8GQH2kbJGA6uJWGoAsdZ4aEu4biRXxrtdX3wvHC6ilM'
    + '&code_challenge_method=S256';
  const plan = planAppAuthorizeEntry(realSearch);
  if (plan.kind !== 'create') assert.fail(`expected a create plan, got ${plan.kind}`);
  assert.deepEqual(plan.request, {
    clientId: 'birdcoder',
    redirectUri: 'birdcoder://auth/callback',
    scope: 'openid profile offline_access',
    state: 'LjERtcYSxP1ANSue1nnycFnGyG9NWmqe',
    codeChallenge: '8GQH2kbJGA6uJWGoAsdZ4aEu4biRXxrtdX3wvHC6ilM',
  });
});

test('an empty or invalid navigation is reported instead of bouncing to the storefront', () => {
  assert.deepEqual(planAppAuthorizeEntry(''), { kind: 'missing-request' });
  assert.deepEqual(
    planAppAuthorizeEntry('?response_type=code&client_id=birdcoder'),
    { kind: 'invalid', problem: 'missing-parameter' },
  );
});

test('the hosted page creates the state through the SDK instead of navigating to the API origin', () => {
  const entry = readFileSync(new URL('./src/app-auth/CloudRouterAppAuthorizeEntry.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(entry, /window\.location\.replace/u);
  assert.doesNotMatch(entry, /buildAppAuthorizeForwardUrl/u);
  assert.match(entry, /oauth\.authorizations\.create/u);
  assert.match(entry, /oauthAuthorizationStateId/u);
  // A failed state creation must report through the app's deep link instead
  // of leaving the desktop waiting for its deadline.
  assert.match(entry, /buildSdkworkDesktopAuthErrorRedirect/u);
  assert.match(entry, /window\.location\.assign/u);
});

test('the portal auth guard keeps the app hand-off page out of the authenticated redirect', () => {
  assert.equal(isPortalAuthRoute(APP_AUTHORIZE_LAUNCH_PATH), true);
  assert.equal(isPortalAppHandoffPath(APP_AUTHORIZE_LAUNCH_PATH), true);
  for (const path of ['/auth/login', '/auth/register', APP_AUTHORIZE_PATH, APP_AUTHORIZE_ALIAS_PATH]) {
    assert.equal(isPortalAppHandoffPath(path), false, path);
  }
});

test('an authenticated login page still completes a pending app sign-in', () => {
  assert.equal(hasPortalOAuthSignInState('?oauthAuthorizationStateId=oauth_state_123'), true);
  assert.equal(hasPortalOAuthSignInState('oauthAuthorizationStateId=oauth_state_123&redirect=ignored'), true);
  assert.equal(hasPortalOAuthSignInState('?oauthAuthorizationStateId=%20%20'), false);
  assert.equal(hasPortalOAuthSignInState('?redirect=%2Fadmin'), false);
  assert.equal(hasPortalOAuthSignInState(''), false);
  assert.equal(hasPortalOAuthSignInState(undefined), false);

  // The login page carrying the IAM-issued sign-in state belongs to the app
  // sign-in flow: the guard must render it instead of redirecting to /admin.
  assert.equal(
    isPortalAppSignInHandoff({ pathname: '/auth/login', search: '?oauthAuthorizationStateId=oauth_state_123' }),
    true,
  );
  assert.equal(
    isPortalAppSignInHandoff({ pathname: APP_AUTHORIZE_LAUNCH_PATH, search: '' }),
    true,
  );
  // A plain auth-route revisit is not part of the flow and may be redirected.
  assert.equal(isPortalAppSignInHandoff({ pathname: '/auth/login', search: '' }), false);
  assert.equal(
    isPortalAppSignInHandoff({ pathname: '/auth/login', search: '?redirect=%2Fadmin' }),
    false,
  );
});

test('the versioned and versionless authorize paths answer the same entry', () => {
  assert.deepEqual([...APP_AUTHORIZE_PATHS], [APP_AUTHORIZE_PATH, APP_AUTHORIZE_VERSIONLESS_PATH]);
  assert.equal(APP_AUTHORIZE_VERSIONLESS_PATH, '/iam/oauth/authorize');
  const app = readFileSync(new URL('./src/App.tsx', import.meta.url), 'utf8');
  for (const path of APP_AUTHORIZE_PATHS) {
    assert.ok(
      app.includes(`path="${path}" element={<CloudRouterAppAuthorizeEntry />}`),
      `App.tsx must mount the hosted entry at ${path}`,
    );
  }
});

test('the router mounts the authorize entry outside the auth-area guard', () => {
  const app = readFileSync(new URL('./src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /path="\/iam\/v3\/oauth\/authorize"[^>]*CloudRouterAppAuthorizeEntry/u);
  assert.match(app, /path="\/auth\/app"[^>]*CloudRouterAppAuthorizeEntry/u);
  const guarded = readFileSync(new URL('./src/auth/protectedPortalRoutes.ts', import.meta.url), 'utf8');
  assert.match(guarded, /!isPortalAppSignInHandoff\(location\)/u);
});
