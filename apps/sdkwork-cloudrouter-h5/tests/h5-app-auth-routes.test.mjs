// Hosted app sign-in on the H5 surface: routes, history routing, and copy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(ROOT, '../..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

/** Route declarations the app root must mount for the hosted app sign-in. */
const APP_AUTH_ROUTES = [
  'path="/oauth/app"',
  'path="/iam/v3/oauth/authorize"',
  'path="/iam/oauth/authorize"',
  'path="/auth/login"',
  'path="/oauth/desktop/launch"',
];

function exportKeys(source) {
  return [...source.matchAll(/'(cloudrouter\.auth\.app\.[^']+)':/gu)].map((match) => match[1]).sort();
}

describe('H5 hosted app sign-in', () => {
  it('mounts the sign-in routes outside the console authentication gate', () => {
    const app = readSource('src/App.tsx');
    for (const route of APP_AUTH_ROUTES) {
      assert.ok(app.includes(route), `App.tsx must declare ${route}`);
    }
    // The console gate lives behind the catch-all route; an auth page nested
    // inside it would never render for an anonymous visitor.
    const catchAllIndex = app.indexOf('path="*"');
    assert.ok(catchAllIndex > 0, 'App.tsx must declare the console catch-all route');
    for (const route of APP_AUTH_ROUTES) {
      assert.ok(app.indexOf(route) < catchAllIndex, `${route} must be declared before the console catch-all`);
    }
    assert.ok(app.includes('ConsoleRuntimeProvider'));
  });

  it('serves the hosted sign-in paths as real pathnames (history routing)', () => {
    const app = readSource('src/App.tsx');
    assert.match(app, /<BrowserRouter>/u);
    const main = readSource('src/main.tsx');
    assert.ok(main.includes('adoptLegacyHashRoute()'));
    assert.ok(main.indexOf('adoptLegacyHashRoute()') < main.indexOf('bootstrapH5Application()'),
      'the legacy hash entry must be normalized before the application boots');
    // A sign-in pathname is rendered as-is; it is never folded into a hash route.
    assert.doesNotMatch(main, /adoptAppAuthHashEntry/u);
  });

  it('declares the same authorization-request contract as the PC entry', () => {
    const entry = readSource('src/app-auth/appAuthorizeEntry.ts');
    for (const token of [
      "APP_AUTHORIZE_PATH = '/iam/v3/oauth/authorize'",
      "APP_AUTHORIZE_VERSIONLESS_PATH = '/iam/oauth/authorize'",
      "APP_AUTHORIZE_ENDPOINT_PATH = '/iam/v3/api/oauth/authorize'",
      // Every route that serves only a native application's browser login
      // keeps the `/oauth` namespace, never the portal's `/auth` surface.
      "APP_AUTHORIZE_ALIAS_PATH = '/oauth/app'",
      "APP_AUTHORIZE_LAUNCH_PATH = '/oauth/desktop/launch'",
      "AUTHORIZATION_STATE_PARAM = 'oauthAuthorizationStateId'",
      "code_challenge_method",
      'unsupported-challenge-method',
      'invalid-redirect-uri',
    ]) {
      assert.ok(entry.includes(token), `appAuthorizeEntry.ts must keep ${token}`);
    }
  });

  it('seeds the canonical credential-entry bootstrap token for the IAM client', () => {
    const canonical = fs.readFileSync(
      path.join(
        REPO,
        '../sdkwork-iam/apps/sdkwork-iam-common/packages/sdkwork-iam-credential-entry/src/constants.ts',
      ),
      'utf8',
    );
    const canonicalKey = /SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN_GLOBAL_KEY\s*=\s*'([^']+)'/u.exec(canonical)?.[1];
    assert.ok(canonicalKey, 'the canonical credential-entry package must declare the bootstrap token key');
    const session = readSource('src/app-auth/appSession.ts');
    assert.ok(
      session.includes(`CREDENTIAL_ENTRY_BOOTSTRAP_GLOBAL = '${canonicalKey}'`),
      'the H5 sign-in must read the same bootstrap-token global the platform injects',
    );
    const iamAuth = readSource('src/bootstrap/iamAuth.ts');
    assert.match(iamAuth, /CREDENTIAL_ENTRY_BOOTSTRAP_GLOBAL/u);
    assert.match(iamAuth, /createIamH5RuntimeService/u);
    assert.match(iamAuth, /accessToken: initialAccessToken/u);
    assert.doesNotMatch(session, /\/auth\/sessions/u, 'the host no longer posts a local login request');
  });

  it('sends both session tokens to the SDK transport', () => {
    const tokenManager = readSource(
      'packages/sdkwork-cloudrouter-h5-core/src/session/tokenManager.ts',
    );
    // The auth token must ride as `Authorization`, never in the refresh slot:
    // a dual-token request missing it is rejected before the route runs.
    assert.match(tokenManager, /manager\.setTokens\(\{ accessToken, authToken \}\)/u);
    assert.doesNotMatch(tokenManager, /refreshToken: authToken/u);
  });

  it('publishes a new authenticated runtime after sign-in', () => {
    const providers = readSource('src/providers/AppProviders.tsx');
    assert.match(providers, /const \[authenticated, setAuthenticated\] = useState/u);
    assert.match(providers, /setAuthenticated\(true\)/u);
    assert.match(providers, /setAuthenticated\(false\)/u);
  });

  it('ships hosted sign-in copy for every supported locale', () => {
    const en = exportKeys(readSource('packages/sdkwork-cloudrouter-h5-i18n/src/i18n/en-US/cloudrouter/auth/app.ts'));
    const zh = exportKeys(readSource('packages/sdkwork-cloudrouter-h5-i18n/src/i18n/zh-CN/cloudrouter/auth/app.ts'));
    assert.ok(en.length > 0);
    assert.deepEqual(zh, en, 'both locales must expose the same hosted sign-in keys');
    const registry = readSource('packages/sdkwork-cloudrouter-h5-i18n/src/i18n/index.ts');
    assert.ok(registry.includes('EnUsAppAuth'));
    assert.ok(registry.includes('ZhCnAppAuth'));
  });

  it('completes the authorization through the SDK client and hands off the deep link', () => {
    const session = readSource('src/app-auth/appSession.ts');
    assert.match(session, /\/oauth\/authorizations\/\$\{encodeURIComponent\(authorizationStateId\)\}\/completions/u);
    const pages = readSource('src/app-auth/AppAuthPages.tsx');
    assert.ok(pages.includes('buildAppLaunchPath(redirectUrl)'));
    assert.ok(pages.includes('window.location.assign(redirectUrl)'));
  });
});
