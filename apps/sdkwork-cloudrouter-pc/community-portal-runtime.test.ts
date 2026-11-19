import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const COMMUNITY_PACKAGE = path.join(
  APP_ROOT,
  'packages/sdkwork-cloudrouter-pc-community',
);

function read(relativePath) {
  return fs.readFileSync(path.join(APP_ROOT, relativePath), 'utf8');
}

function readPackage(relativePath) {
  return fs.readFileSync(path.join(COMMUNITY_PACKAGE, relativePath), 'utf8');
}

test('the portal mounts the complete community route workspace', () => {
  const app = read('src/App.tsx');
  assert.match(app, /@sdkwork\/cloudrouter-pc-community/u);
  // React Router's `createRoutesFromChildren` only accepts `<Route>` and
  // `<React.Fragment>` element children, so the contribution is invoked as a
  // function; rendering it as `<CommunityPortalRoutes />` throws
  // "[CommunityPortalRoutes] is not a <Route> component" for every portal page.
  assert.match(app, /\{CommunityPortalRoutes\(\)\}/u);
  assert.doesNotMatch(app, /<CommunityPortalRoutes\s*\/>/u);

  const routes = readPackage('src/index.tsx');
  for (const route of [
    'path="/community"',
    'path="/community/new"',
    'path="/community/mine"',
    'path="/community/:circleId"',
    'path="/community/:circleId/manage"',
    'path="/community/:circleId/post/:entryId"',
  ]) {
    assert.ok(routes.includes(route), `portal route ${route} is mounted`);
  }
});

test('React Router accepts the community contribution as <Routes> children', async () => {
  // The shell places `extraRoutes` inside its `<Routes>` block, and
  // `createRoutesFromChildren` rejects every child that is not a `<Route>` or
  // `<React.Fragment>`. This pins the router contract itself, so a regression
  // cannot hide behind a passing source-shape assertion.
  const { createRoutesFromChildren } = await import('react-router-dom');
  const { CommunityPortalRoutes } = await import('@sdkwork/cloudrouter-pc-community');

  const routes = createRoutesFromChildren(CommunityPortalRoutes());

  assert.deepEqual(
    routes.map((route) => route.path),
    [
      '/community',
      '/community/new',
      '/community/mine',
      '/community/:circleId',
      '/community/:circleId/manage',
      '/community/:circleId/post/:entryId',
    ],
  );
});

test('the portal navigation exposes the community entry', () => {
  const navbar = fs.readFileSync(
    path.join(
      APP_ROOT,
      'packages/sdkwork-cloudroutes-pc-commons/src/components/Navbar.tsx',
    ),
    'utf8',
  );
  assert.match(navbar, /t\('nav\.community'\), href: '\/community'/u);

  const navigation = fs.readFileSync(
    path.join(
      APP_ROOT,
      'packages/sdkwork-cloudrouter-pc-i18n/src/resources/shared/navigation.ts',
    ),
    'utf8',
  );
  assert.match(navigation, /"nav\.community"/u);
});

test('the community runtime uses generated SDK ports and never raw HTTP', () => {
  const runtime = readPackage('src/runtime.ts');
  assert.match(runtime, /createGeneratedCommunityAppSdkPort/u);
  assert.match(runtime, /getSdkworkCommunityAppSdkClient/u);
  assert.match(runtime, /getSdkworkFeedsOpenSdkClient/u);
  assert.match(runtime, /getSdkworkOrderAppSdkClient/u);
  assert.match(runtime, /memberships\.orders\.create/u);
  assert.match(runtime, /createDriveUploadImageService/u);
  assert.match(runtime, /isCircleOrderPaid/u);
  assert.match(runtime, /isPaidCircleOrderStatus/u);
  assert.match(runtime, /resolveCommunityResourceUrl/u);
  assert.doesNotMatch(runtime, /\bfetch\s*\(/u);
  assert.doesNotMatch(runtime, /axios/u);
});

test('the portal exposes the complete publish, moderation, and group flows', () => {
  const detail = readPackage('src/pages/CommunityDetailPage.tsx');
  assert.match(detail, /getPostsByCommunityTag/u);
  assert.match(detail, /createResource/u);
  assert.match(detail, /composerSection/u);
  assert.match(detail, /pendingReview/u);

  const postCard = readPackage('src/components/PostCard.tsx');
  assert.match(postCard, /pendingReview/u);

  const join = readPackage('src/components/JoinCircleDialog.tsx');
  assert.match(join, /isCircleOrderPaid/u);
  assert.match(join, /lifetime/u);
  assert.match(join, /PAYMENT_POLL_INTERVAL_MS/u);
  assert.match(join, /readPendingCircleOrder/u);
  assert.match(join, /savePendingCircleOrder/u);

  const manage = readPackage('src/pages/CommunityManagePage.tsx');
  assert.match(manage, /QRCode\.toDataURL/u);
  assert.match(manage, /deleteCommunity/u);
  assert.match(manage, /addQrToGroup/u);
  assert.match(manage, /updateMembershipTier/u);
});

test('the community copy is merged into the host catalog', () => {
  const resources = fs.readFileSync(
    path.join(
      APP_ROOT,
      'packages/sdkwork-cloudrouter-pc-i18n/src/resources/index.ts',
    ),
    'utf8',
  );
  assert.match(resources, /communityUiMessages/u);

  const i18n = readPackage('src/i18n.ts');
  const enKeys = [...i18n.matchAll(/'(communityUi\.[^']+)':/gu)].length;
  assert.ok(enKeys % 2 === 0, 'en/zh carry the same number of keys');
});

test('the community post media upload identity is declared', () => {
  const declaration = JSON.parse(
    read('specs/upload.declaration.json').replace(/^\uFEFF/u, ''),
  );
  const entry = declaration.declarations.find(
    (item) => item.appResourceType === 'community.post_media',
  );
  assert.ok(entry, 'community.post_media is declared');
  assert.equal(entry.scene, 'community-post');
  assert.equal(entry.source, 'cloudrouter-pc-community-post-upload');
});
