/**
 * Per-store publishing regression suite.
 *
 * Run from the application root:
 *   node --test tests/store-publishing.test.mjs
 *
 * The first block validates the real `etc/store-publishing/` documents and the
 * projected `agent.app.config.json`; the rest mutate one dimension at a time to
 * prove that each store lane fails closed on its own.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  buildManifestProjection,
  buildMarketReleases,
  buildMediaProjection,
  buildStoreLanes,
  loadCaptureMetadata,
  loadStoreConfigs,
  loadStoreProfiles,
  MARKET_RULES,
  resolveSpecsRoot,
  validateManifestAlignment,
  validateStoreConfigs,
} from '../scripts/store-publishing-lib.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specsRoot = resolveSpecsRoot(appRoot);
const manifest = JSON.parse(fs.readFileSync(path.join(appRoot, 'agent.app.config.json'), 'utf8'));
const profiles = loadStoreProfiles(specsRoot);
const realConfigs = loadStoreConfigs(appRoot);

function cloneConfigs() {
  return structuredClone(realConfigs);
}

function issuesFor(configs, overrides = {}) {
  return validateStoreConfigs({
    appRoot,
    configs,
    profiles,
    manifest: overrides.manifest ?? manifest,
  });
}

test('the shipped store documents validate', () => {
  const issues = issuesFor(realConfigs);
  assert.deepEqual(issues, []);
  assert.equal(realConfigs.length, 3);
  assert.deepEqual(
    realConfigs.map((entry) => entry.config.marketId),
    ['APPLE_APP_STORE', 'GOOGLE_PLAY', 'HUAWEI_APPGALLERY'],
  );
});

test('each market has an independent document and rule set', () => {
  const byMarket = new Map(realConfigs.map((entry) => [entry.config.marketId, entry.config]));
  assert.deepEqual(byMarket.get('APPLE_APP_STORE').platforms, ['ios']);
  assert.deepEqual(byMarket.get('GOOGLE_PLAY').platforms, ['android']);
  assert.deepEqual(byMarket.get('HUAWEI_APPGALLERY').platforms, ['android', 'harmony']);
  assert.equal(MARKET_RULES.GOOGLE_PLAY.forbidsChina, true);
  assert.equal(MARKET_RULES.APPLE_APP_STORE.requiresChina, true);
  assert.equal(MARKET_RULES.HUAWEI_APPGALLERY.requiresChina, true);
});

test('the store set covers both China and the United States', () => {
  const issues = issuesFor(realConfigs);
  assert.deepEqual(issues, []);
  const countries = new Set(realConfigs.flatMap((entry) => entry.config.release.countries));
  assert.ok(countries.has('CN'));
  assert.ok(countries.has('US'));
});

test('Google Play rejects mainland China distribution', () => {
  const configs = cloneConfigs();
  const google = configs.find((entry) => entry.config.marketId === 'GOOGLE_PLAY');
  google.config.release.countries.push('CN');
  assert.ok(issuesFor(configs).some((issue) => /does not distribute in mainland China/.test(issue)));
});

test('a China lane cannot drop mainland China', () => {
  const configs = cloneConfigs();
  const apple = configs.find((entry) => entry.config.marketId === 'APPLE_APP_STORE');
  apple.config.release.countries = apple.config.release.countries.filter((country) => country !== 'CN');
  assert.ok(issuesFor(configs).some((issue) => /must include CN/.test(issue)));
});

test('every lane must still reach the United States', () => {
  const configs = cloneConfigs();
  for (const entry of configs) {
    entry.config.release.countries = entry.config.release.countries.filter((country) => country !== 'US');
  }
  const issues = issuesFor(configs);
  assert.ok(issues.some((issue) => /must include US/.test(issue)));
  assert.ok(issues.some((issue) => /do not cover the United States/.test(issue)));
});

test('a market cannot publish a platform it does not own', () => {
  const configs = cloneConfigs();
  const apple = configs.find((entry) => entry.config.marketId === 'APPLE_APP_STORE');
  apple.config.platforms = ['android'];
  assert.ok(issuesFor(configs).some((issue) => /cannot publish android/.test(issue)));
});

test('credential values must be references, never literals', () => {
  const configs = cloneConfigs();
  const google = configs.find((entry) => entry.config.marketId === 'GOOGLE_PLAY');
  google.config.submission.credentialRefs.serviceAccount = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC';
  assert.ok(issuesFor(configs).some((issue) => /never a literal secret/.test(issue)));
});

test('a duplicated market is rejected', () => {
  const configs = cloneConfigs();
  configs.push(structuredClone(configs.find((entry) => entry.config.marketId === 'GOOGLE_PLAY')));
  assert.ok(issuesFor(configs).some((issue) => /duplicate marketId/.test(issue)));
});

test('an unknown market has no profile and no rule', () => {
  const configs = cloneConfigs();
  const apple = configs.find((entry) => entry.config.marketId === 'APPLE_APP_STORE');
  apple.config.marketId = 'AMAZON_APPSTORE';
  assert.ok(issuesFor(configs).some((issue) => /has no market rule/.test(issue)));
});

test('Google Play requires its feature graphic', () => {
  const configs = cloneConfigs();
  const google = configs.find((entry) => entry.config.marketId === 'GOOGLE_PLAY');
  delete google.config.media.featureGraphic;
  assert.ok(issuesFor(configs).some((issue) => /featureGraphic is required/.test(issue)));
});

test('an icon at the wrong pixel size is rejected', () => {
  const configs = cloneConfigs();
  const apple = configs.find((entry) => entry.config.marketId === 'APPLE_APP_STORE');
  apple.config.media.icon = 'assets/media/store/icons/google/play-icon-512.png';
  assert.ok(issuesFor(configs).some((issue) => /requires 1024x1024/.test(issue)));
});

test('a declared platform without its screenshot shelf is rejected', () => {
  const configs = cloneConfigs();
  const huawei = configs.find((entry) => entry.config.marketId === 'HUAWEI_APPGALLERY');
  huawei.config.media.screenshots = huawei.config.media.screenshots.filter(
    (group) => group.platform !== 'APP_HARMONY',
  );
  assert.ok(issuesFor(configs).some((issue) => /no screenshot shelf for APP_HARMONY/.test(issue)));
});

test('App Store needs an accepted 6.9-inch screenshot shelf', () => {
  const configs = cloneConfigs();
  const apple = configs.find((entry) => entry.config.marketId === 'APPLE_APP_STORE');
  apple.config.media.screenshots[0].root = 'assets/media/store/screenshots/android';
  assert.ok(issuesFor(configs).some((issue) => /accepted IPHONE_6_9 size/.test(issue)));
});

test('an unsupported release track is rejected per market', () => {
  const configs = cloneConfigs();
  const apple = configs.find((entry) => entry.config.marketId === 'APPLE_APP_STORE');
  apple.config.release.track = 'PRODUCTION';
  assert.ok(issuesFor(configs).some((issue) => /release.track PRODUCTION is not allowed/.test(issue)));
});

test('the projection produces independent manifest lanes and market releases', () => {
  const lanes = buildStoreLanes({ configs: realConfigs, specsRoot });
  assert.equal(lanes.length, 3);
  assert.deepEqual(lanes.map((lane) => lane.marketId), ['APPLE_APP_STORE', 'GOOGLE_PLAY', 'HUAWEI_APPGALLERY']);
  assert.ok(lanes.every((lane) => lane.status === 'READY'));
  assert.ok(lanes.every((lane) => lane.configRef.startsWith('etc/store-publishing/')));
  assert.ok(lanes[1].storeUrl.startsWith('https://play.google.com/store/apps/details?id='));

  const releases = buildMarketReleases({ configs: realConfigs, version: manifest.release.currentVersion });
  assert.equal(releases.length, 3);
  assert.ok(releases.every((release) => release.status === 'PENDING_SUBMISSION'));
  assert.ok(releases.every((release) => release.releaseVersion === manifest.release.currentVersion));
});

test('the media projection tags store screenshots and keeps catalog shelves', () => {
  const capture = loadCaptureMetadata(appRoot);
  const media = buildMediaProjection({
    appRoot,
    configs: realConfigs,
    version: manifest.release.currentVersion,
    capture,
  });
  assert.equal(media.screenshots.length, 40);
  const catalog = media.screenshots.filter((asset) => !asset.storePlatform);
  assert.equal(catalog.length, 20);
  assert.deepEqual(
    [...new Set(catalog.map((asset) => asset.platform))].sort(),
    ['APP', 'APP_ANDROID', 'APP_HARMONY', 'APP_IOS'],
  );
  const apple = media.screenshots.filter((asset) => asset.storePlatform === 'APPLE_APP_STORE');
  assert.equal(apple.length, 5);
  assert.ok(apple.every((asset) => asset.width === 1320 && asset.height === 2868));
  assert.ok(apple.every((asset) => asset.purpose === 'STORE_SUBMISSION'));
  const huawei = media.screenshots.filter((asset) => asset.storePlatform === 'HUAWEI_APPGALLERY');
  assert.equal(huawei.length, 10);
  assert.deepEqual(
    [...new Set(huawei.map((asset) => asset.platform))].sort(),
    ['APP_ANDROID', 'APP_HARMONY'],
  );
  assert.ok(media.icons.some((asset) => asset.storePlatform === 'GOOGLE_PLAY' && asset.width === 512));
  assert.ok(media.previews.some((asset) => asset.type === 'FEATURE_GRAPHIC' && asset.storePlatform === 'GOOGLE_PLAY'));
  assert.ok(media.previews.some((asset) => asset.type === 'COVER'));
  assert.equal(media.primaryIcon.path, 'assets/media/icons/app-icon-1024.png');
});

test('the manifest projection is idempotent and passes alignment', () => {
  const first = buildManifestProjection({ appRoot, specsRoot, manifest });
  const second = buildManifestProjection({ appRoot, specsRoot, manifest });
  assert.deepEqual(first, second);
  assert.deepEqual(first.issues, []);
  assert.deepEqual(validateManifestAlignment(manifest, realConfigs), []);
  assert.deepEqual(manifest.publish.stores, first.stores);
  const current = manifest.release.notes.find((note) => note.current === true);
  assert.deepEqual(current.metadata.marketReleases, first.marketReleases);
});
