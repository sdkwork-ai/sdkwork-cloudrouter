// H5 login must integrate the shared sdkwork-iam screens, not a local form.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/^\uFEFF/u, ''));
}

describe('H5 IAM auth integration', () => {
  it('renders the shared IAM H5 login surface for console sign-in', () => {
    const authGate = read('src/AuthGate.tsx');
    assert.ok(authGate.includes('@sdkwork/iam-h5-auth'), 'the sign-in route imports the IAM package');
    assert.ok(
      authGate.includes('SdkworkIamH5AuthLoginSurface'),
      'the sign-in route renders the IAM login surface',
    );
    assert.ok(authGate.includes('iamAuthController'), 'the IAM controller is supplied by the runtime');
    // The gate/route must not build its own credential form.
    assert.ok(!authGate.includes('<input'), 'no local credential form is rendered');
    assert.ok(!authGate.includes('onSignIn'), 'no local sign-in callback is implemented');
  });

  it('builds the IAM runtime and bridges the committed session into CloudRouter', () => {
    const iamAuth = read('src/bootstrap/iamAuth.ts');
    assert.match(iamAuth, /createIamH5RuntimeService/u);
    assert.match(iamAuth, /createSdkworkIamH5AuthController/u);
    assert.match(iamAuth, /applyCloudRouterSessionTokens/u);
    assert.match(iamAuth, /commitSession/u);
    const providers = read('src/providers/AppProviders.tsx');
    assert.ok(providers.includes('createCloudRouterIamAuth'), 'the runtime builds the IAM auth host');
    assert.ok(providers.includes('iamAuthController'), 'the runtime exposes the IAM controller');
    assert.ok(!providers.includes('signInConsoleSession'), 'the runtime no longer owns a local sign-in');
  });

  it('uses the IAM surface for the hosted app sign-in too', () => {
    const pages = read('src/app-auth/AppAuthPages.tsx');
    assert.ok(
      pages.includes('SdkworkIamH5AuthLoginSurface'),
      'hosted app sign-in renders the IAM surface',
    );
    assert.ok(!pages.includes('<input'), 'hosted app sign-in has no local credential inputs');
    assert.ok(!pages.includes('signInConsoleSession'), 'hosted app sign-in uses IAM, not the local session call');
  });

  it('mounts the IAM OAuth callback and adopts its real pathname', () => {
    const app = read('src/App.tsx');
    assert.ok(app.includes('path="/auth/oauth/callback"'), 'the IAM OAuth callback route is mounted');
    assert.ok(app.includes('IamOAuthCallbackRoute'));
    const route = read('src/routes/IamAuthRoutes.tsx');
    assert.ok(route.includes('SdkworkIamH5AuthCallbackSurface'));
    const entry = read('src/app-auth/appAuthorizeEntry.ts');
    assert.ok(entry.includes("APP_OAUTH_CALLBACK_PATH = '/auth/oauth/callback'"));
    assert.ok(entry.includes('APP_OAUTH_CALLBACK_PATH,'));
  });

  it('declares the IAM H5 packages as workspace dependencies', () => {
    const manifest = readJson('package.json');
    assert.equal(manifest.dependencies['@sdkwork/iam-h5-auth'], 'workspace:*');
    assert.equal(manifest.dependencies['@sdkwork/iam-h5-core'], 'workspace:*');
    const workspace = read('../../pnpm-workspace.yaml');
    assert.ok(workspace.includes('sdkwork-iam-h5/packages/sdkwork-iam-h5-auth'));
    assert.ok(workspace.includes('sdkwork-iam-h5/packages/sdkwork-iam-h5-core'));
  });

  it('aligns the IAM H5 auth surface with the tech-blue theme', () => {
    const iamAuthRoot = path.resolve(
      ROOT,
      '../../../sdkwork-iam/apps/sdkwork-iam-h5/packages/sdkwork-iam-h5-auth',
    );
    const css = fs.readFileSync(
      path.join(iamAuthRoot, 'src/styles/iam-h5-auth-surface.css'),
      'utf8',
    );
    assert.match(css, /--iam-h5-auth-accent:\s*#2563eb/u, 'the IAM accent is tech blue');
    assert.match(css, /--iam-h5-auth-bg:\s*#0b1220/u, 'the IAM surface uses the navy tech base');
    assert.match(css, /--iam-h5-auth-link:\s*#60a5fa/u, 'links use the blue accent');
    const header = fs.readFileSync(
      path.join(iamAuthRoot, 'src/components/AuthHeader.tsx'),
      'utf8',
    );
    assert.ok(header.includes('ShieldCheck'), 'the IAM header uses a blue identity shield');
    assert.ok(header.includes('from-[#3b82f6]'), 'the IAM mark uses the blue gradient');
  });

  it('lets the sign-in page go back when it was reached from another page', () => {
    const iamAuthRoot = path.resolve(
      ROOT,
      '../../../sdkwork-iam/apps/sdkwork-iam-h5/packages/sdkwork-iam-h5-auth',
    );
    const login = fs.readFileSync(
      path.join(iamAuthRoot, 'src/pages/AuthLoginScreen.tsx'),
      'utf8',
    );
    assert.ok(login.includes('onBack'), 'the IAM login screen accepts an onBack callback');
    assert.ok(login.includes('backToPrevious'), 'the IAM back button has localized copy');
    assert.ok(login.includes('ChevronLeft'), 'the IAM back button renders a back glyph');
    const authGate = read('src/AuthGate.tsx');
    assert.ok(authGate.includes('canGoBack'), 'the host decides whether a previous page exists');
    assert.ok(authGate.includes('onBack: handleBack'), 'the host wires the IAM back action');
  });
});
