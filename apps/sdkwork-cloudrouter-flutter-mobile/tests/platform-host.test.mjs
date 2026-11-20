/**
 * Platform host consistency regression.
 *
 * Run from the application root:
 *   node --test tests/platform-host.test.mjs
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  collectPlatformHostFacts,
  MOBILE_BUNDLE_ID,
  validatePlatformHostFacts,
} from '../scripts/platform-host-lib.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const realFacts = collectPlatformHostFacts(appRoot);

function facts() {
  return structuredClone(realFacts);
}

test('the shipped iOS, Android and HarmonyOS hosts agree with the manifest', () => {
  assert.deepEqual(validatePlatformHostFacts(realFacts), []);
  assert.equal(realFacts.manifest.bundleId, MOBILE_BUNDLE_ID);
  assert.equal(realFacts.harmony.bundleName, MOBILE_BUNDLE_ID);
  assert.equal(realFacts.android.applicationId, MOBILE_BUNDLE_ID);
  assert.equal(new Set(realFacts.ios.bundleIds.filter((id) => !id.endsWith('.RunnerTests'))).size, 1);
});

test('a bundle id renamed in one host is rejected', () => {
  const mutated = facts();
  mutated.harmony.bundleName = 'com.sdkwork.other';
  assert.ok(validatePlatformHostFacts(mutated).some((issue) => /harmony: bundleName/u.test(issue)));
  const android = facts();
  android.android.applicationId = 'com.sdkwork.other';
  assert.ok(validatePlatformHostFacts(android).some((issue) => /android: applicationId/u.test(issue)));
});

test('a version bumped only in the manifest is rejected', () => {
  const mutated = facts();
  mutated.manifest.version = '9.9.9';
  const issues = validatePlatformHostFacts(mutated);
  assert.ok(issues.some((issue) => /pubspec.yaml: version/u.test(issue)));
  assert.ok(issues.some((issue) => /harmony: versionName/u.test(issue)));
});

test('a HarmonyOS page or resource reference with no file is rejected', () => {
  const page = facts();
  page.harmony.mainPages = ['pages/Missing'];
  assert.ok(validatePlatformHostFacts(page).some((issue) => /missing pages\/Missing\.ets/u.test(issue)));

  const media = facts();
  media.harmony.resourceRefs = ['$media:missingIcon'];
  assert.ok(validatePlatformHostFacts(media).some((issue) => /missing media missingIcon/u.test(issue)));

  const string = facts();
  string.harmony.resourceRefs = ['$string:missing_label'];
  assert.ok(validatePlatformHostFacts(string).some((issue) => /missing string missing_label/u.test(issue)));

  const color = facts();
  color.harmony.resourceRefs = ['$color:missing_color'];
  assert.ok(validatePlatformHostFacts(color).some((issue) => /missing color missing_color/u.test(issue)));
});

test('a missing App Store icon or Android launcher shelf is rejected', () => {
  const ios = facts();
  ios.ios.has1024 = false;
  assert.ok(validatePlatformHostFacts(ios).some((issue) => /AppIcon 1024x1024/u.test(issue)));
  const android = facts();
  android.android.mipmaps = ['mdpi'];
  assert.ok(validatePlatformHostFacts(android).some((issue) => /five mipmap launcher icons/u.test(issue)));
});

test('iPad shipping and the manifest platform declaration must agree', () => {
  const shipsWithoutDeclaration = facts();
  shipsWithoutDeclaration.ios.targetedDeviceFamilies = ['1', '2'];
  assert.ok(
    validatePlatformHostFacts(shipsWithoutDeclaration).some((issue) => /includes iPad/u.test(issue)),
  );
  const declaresWithoutSupport = facts();
  declaresWithoutSupport.manifest.targetPlatforms = ['ios', 'ipados', 'android', 'harmony'];
  declaresWithoutSupport.ios.targetedDeviceFamilies = ['1'];
  assert.ok(
    validatePlatformHostFacts(declaresWithoutSupport).some((issue) => /omits iPad/u.test(issue)),
  );
});

test('a missing host project is rejected', () => {
  const mutated = facts();
  mutated.hosts.harmony = false;
  assert.ok(validatePlatformHostFacts(mutated).some((issue) => /harmony: host project is missing/u.test(issue)));
});
