/**
 * Store submission planner regression.
 *
 * Run from the application root:
 *   node --test tests/store-submission.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { buildStoreSubmissionPlans, discoverArtifacts } from '../scripts/store-submission-lib.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(appRoot, 'agent.app.config.json'), 'utf8'));

function artifactsFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudrouter-store-artifacts-'));
  fs.writeFileSync(path.join(dir, 'ios.ipa'), 'ipa');
  fs.writeFileSync(path.join(dir, 'android.aab'), 'aab');
  fs.writeFileSync(path.join(dir, 'harmony.hap'), 'hap');
  return dir;
}

test('discovers the three mobile artifact formats', () => {
  const dir = artifactsFixture();
  const artifacts = discoverArtifacts(dir);
  assert.deepEqual(artifacts.map((artifact) => artifact.format).sort(), ['AAB', 'HAP', 'IPA']);
});

test('one independent plan is emitted per market target', () => {
  const { plans } = buildStoreSubmissionPlans({
    appRoot,
    manifest,
    artifactsDir: artifactsFixture(),
  });
  assert.deepEqual(
    plans.map((plan) => `${plan.marketId}/${plan.targetId}`),
    [
      'APPLE_APP_STORE/ios',
      'GOOGLE_PLAY/android',
      'HUAWEI_APPGALLERY/android',
      'HUAWEI_APPGALLERY/harmony',
    ],
  );
  const apple = plans.find((plan) => plan.marketId === 'APPLE_APP_STORE');
  const google = plans.find((plan) => plan.marketId === 'GOOGLE_PLAY');
  const huaweiAndroid = plans.find((plan) => plan.marketId === 'HUAWEI_APPGALLERY' && plan.targetId === 'android');
  const huaweiHarmony = plans.find((plan) => plan.marketId === 'HUAWEI_APPGALLERY' && plan.targetId === 'harmony');
  assert.equal(apple.provider, 'app-store-connect');
  assert.match(apple.endpoint, /appStoreVersions/u);
  assert.deepEqual(apple.artifacts, ['ios.ipa']);
  assert.equal(google.provider, 'google-play-developer-api');
  assert.match(google.endpoint, /applications\/com\.sdkwork\.cloudrouter\.mobile\/edits/u);
  assert.deepEqual(huaweiAndroid.artifacts, ['android.aab']);
  assert.deepEqual(huaweiHarmony.artifacts, ['harmony.hap']);
  assert.equal(huaweiAndroid.body.packageType, 'ANDROID');
  assert.equal(huaweiHarmony.body.packageType, 'HARMONY');
});

test('credential references stay references', () => {
  const { plans } = buildStoreSubmissionPlans({
    appRoot,
    manifest,
    artifactsDir: artifactsFixture(),
  });
  const serialized = JSON.stringify(plans);
  assert.ok(serialized.includes('env:SDKWORK_GOOGLE_PLAY_SERVICE_ACCOUNT'));
  assert.ok(!/BEGIN (RSA )?PRIVATE KEY/u.test(serialized));
  assert.ok(!serialized.includes('MIIEvQ'));
});

test('external console steps are reported instead of invented ids', () => {
  const { plans } = buildStoreSubmissionPlans({
    appRoot,
    manifest,
    artifactsDir: artifactsFixture(),
  });
  const apple = plans.find((plan) => plan.marketId === 'APPLE_APP_STORE');
  const huaweiPlans = plans.filter((plan) => plan.marketId === 'HUAWEI_APPGALLERY');
  const google = plans.find((plan) => plan.marketId === 'GOOGLE_PLAY');
  assert.ok(apple.externalSteps.some((step) => /appleId/u.test(step)));
  assert.ok(huaweiPlans.every((plan) => plan.externalSteps.some((step) => /appId/u.test(step))));
  assert.deepEqual(google.externalSteps, []);
});

test('external console steps do not fail the local plan', () => {
  const { issues } = buildStoreSubmissionPlans({
    appRoot,
    manifest,
    artifactsDir: artifactsFixture(),
  });
  assert.deepEqual(issues, []);
});

test('a missing HarmonyOS package does not block the AppGallery Android target', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudrouter-store-android-'));
  fs.writeFileSync(path.join(dir, 'android.aab'), 'aab');
  const { plans, issues } = buildStoreSubmissionPlans({ appRoot, manifest, artifactsDir: dir });
  const huaweiAndroid = plans.find((plan) => plan.marketId === 'HUAWEI_APPGALLERY' && plan.targetId === 'android');
  assert.deepEqual(huaweiAndroid.artifacts, ['android.aab']);
  assert.ok(!issues.some((issue) => issue.startsWith('HUAWEI_APPGALLERY/android')));
  assert.ok(issues.some((issue) => /HUAWEI_APPGALLERY\/harmony: no built HAP/u.test(issue)));
  assert.ok(issues.some((issue) => /APPLE_APP_STORE\/ios: no built IPA/u.test(issue)));
});

test('a lane without its built artifact fails the preflight', () => {
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudrouter-store-empty-'));
  const { issues } = buildStoreSubmissionPlans({ appRoot, manifest, artifactsDir: emptyDir });
  assert.ok(issues.some((issue) => /APPLE_APP_STORE\/ios: no built IPA/u.test(issue)));
  assert.ok(issues.some((issue) => /GOOGLE_PLAY\/android: no built AAB/u.test(issue)));
  assert.ok(issues.some((issue) => /HUAWEI_APPGALLERY\/android: no built AAB/u.test(issue)));
  assert.ok(issues.some((issue) => /HUAWEI_APPGALLERY\/harmony: no built HAP/u.test(issue)));
});
