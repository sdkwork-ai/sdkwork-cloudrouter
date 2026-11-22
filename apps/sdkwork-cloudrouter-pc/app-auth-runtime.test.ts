// Hosted app sign-in entry: request contract, plan selection, and the OAuth /
// account-surface separation the portal routes and guard rely on.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  APP_AUTHORIZE_LOGIN_PATH,
  APP_AUTHORIZE_LAUNCH_PATH,
  APP_AUTHORIZE_PATH,
  APP_AUTHORIZE_PATHS,
  APP_AUTHORIZE_VERSIONLESS_PATH,
  isAppCallbackRedirectUri,
  parseAppAuthorizeRequest,
  planAppAuthorizeEntry,
} from './src/app-auth/appAuthorizeEntry.ts';
import {
  isPortalAuthRoute,
  isPortalOAuthRoute,
  sanitizePortalAuthRedirect,
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

test('a full request renders the hosted auth surface in place', () => {
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

test('the hosted page renders the auth surface and leaves the state to the login page', () => {
  const entry = readFileSync(new URL('./src/app-auth/CloudRouterAppAuthorizeEntry.tsx', import.meta.url), 'utf8');
  // A valid request (create) and a request that already carries the IAM state
  // both render the hosted auth surface in place.
  assert.match(entry, /plan\.kind === 'create' \|\| plan\.kind === 'hosted'/u);
  assert.match(entry, /CloudRouterAuthRoutes/u);
  // The page never creates the pending state itself: the hosted login does,
  // when the browser actually signs in or confirms the account.
  assert.doesNotMatch(entry, /oauth\.authorizations\.create/u);
  assert.doesNotMatch(entry, /window\.location\.(replace|assign)/u);
});

test('the hosted auth header reuses the homepage brand lockup', () => {
  // The header must be the same backend-configured lockup as the navbar: the
  // site branding (BrandMark plus the short name), not a second brand render.
  const routes = readFileSync(new URL('./src/auth/CloudRouterAuthRoutes.tsx', import.meta.url), 'utf8');
  assert.match(routes, /BrandMark/u);
  assert.match(routes, /siteBranding\.shortName \|\| siteBranding\.siteName/u);
  assert.match(routes, /brandHeader=\{brandHeader\}/u);
  const entry = readFileSync(new URL('./src/app-auth/CloudRouterAppAuthorizeEntry.tsx', import.meta.url), 'utf8');
  assert.match(entry, /BrandMark/u);
  assert.match(entry, /brandNode=\{brandHeader\}/u);
});

test('the OAuth namespace and the account surface never overlap', () => {
  // The hand-off page, the login step, and the provider callback are OAuth
  // protocol routes; the `/auth` account surface is a different system.
  assert.equal(isPortalAuthRoute(APP_AUTHORIZE_LAUNCH_PATH), false);
  assert.equal(isPortalAuthRoute(APP_AUTHORIZE_LOGIN_PATH), false);
  assert.equal(isPortalOAuthRoute(APP_AUTHORIZE_LAUNCH_PATH), true);
  assert.equal(isPortalOAuthRoute(APP_AUTHORIZE_LOGIN_PATH), true);
  assert.equal(isPortalOAuthRoute('/oauth/callback/github'), true);
  for (const path of ['/auth/login', '/auth/register', '/admin', '/console']) {
    assert.equal(isPortalOAuthRoute(path), false, path);
  }
  assert.equal(isPortalAuthRoute('/auth/login'), true);
  assert.equal(isPortalAuthRoute('/oauth/callback/github'), false);
});

test('a return target never aims at the OAuth protocol namespace', () => {
  for (const target of ['/oauth/login', '/oauth/callback/github', '/oauth/desktop/launch']) {
    assert.equal(sanitizePortalAuthRedirect(target, '/'), '/', target);
  }
  assert.equal(sanitizePortalAuthRedirect('/console/dashboard', '/'), '/console/dashboard');
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

test('the router mounts every OAuth route outside the account-surface guard', () => {
  const app = readFileSync(new URL('./src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /path="\/iam\/v3\/oauth\/authorize"[^>]*CloudRouterAppAuthorizeEntry/u);
  assert.match(app, /path="\/oauth\/app"[^>]*CloudRouterAppAuthorizeEntry/u);
  // The login step, the hand-off page, and the provider callback render the
  // hosted IAM routes that own those OAuth flows.
  for (const path of ['/oauth/login', '/oauth/desktop/launch', '/oauth/callback/:provider']) {
    assert.match(
      app,
      new RegExp(`path="${path}"[^>]*CloudRouterAuthRoutes`, 'u'),
      `App.tsx must mount the OAuth surface at ${path}`,
    );
  }
  // No OAuth route hides under the account prefix, and the account surface has
  // no catch-all that could swallow an OAuth path.
  assert.doesNotMatch(app, /path="\/auth\/[^"]*oauth/iu);
  assert.match(app, /path="\/auth\/\*"/u);
  const guarded = readFileSync(new URL('./src/auth/protectedPortalRoutes.ts', import.meta.url), 'utf8');
  // The account-surface guard carries no OAuth hand-off exemption: the OAuth
  // routes are outside the `/auth/*` mount entirely.
  assert.doesNotMatch(guarded, /isPortalAppSignInHandoff|isPortalAppHandoffPath/u);
});
