/**
 * Platform host consistency facts and rules.
 *
 * The Flutter root ships three device hosts. The manifest, the iOS Xcode
 * project, the Android Gradle project and the HarmonyOS Stage project must all
 * agree on identity, version and resources; a rename in one host silently
 * breaks store submission for the others. This module collects those facts and
 * reports every disagreement.
 */
import fs from 'node:fs';
import path from 'node:path';

export const MOBILE_BUNDLE_ID = 'com.sdkwork.cloudrouter.mobile';

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : undefined;
}

function readJson(filePath) {
  const text = readText(filePath);
  if (text === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function firstMatch(pattern, text) {
  const match = pattern.exec(text ?? '');
  return match ? match[1].trim() : undefined;
}

/** Reads the three host projects into one comparable fact object. */
export function collectPlatformHostFacts(appRoot) {
  const manifest = readJson(path.join(appRoot, 'agent.app.config.json')) ?? {};
  const pubspec = readText(path.join(appRoot, 'pubspec.yaml')) ?? '';
  const pbxproj = readText(path.join(appRoot, 'ios', 'Runner.xcodeproj', 'project.pbxproj'));
  const infoPlist = readText(path.join(appRoot, 'ios', 'Runner', 'Info.plist'));
  const appIconDir = path.join(appRoot, 'ios', 'Runner', 'Assets.xcassets', 'AppIcon.appiconset');
  const appIconContents = readJson(path.join(appIconDir, 'Contents.json'));
  const androidGradle = readText(path.join(appRoot, 'android', 'app', 'build.gradle.kts'))
    ?? readText(path.join(appRoot, 'android', 'app', 'build.gradle'));
  const harmonyApp = readJson(path.join(appRoot, 'harmony', 'AppScope', 'app.json5'));
  const harmonyModule = readJson(path.join(appRoot, 'harmony', 'entry', 'src', 'main', 'module.json5'));
  const harmonyResources = path.join(appRoot, 'harmony', 'entry', 'src', 'main', 'resources', 'base');
  const harmonyMainPages = readJson(path.join(harmonyResources, 'profile', 'main_pages.json'));
  const harmonyStrings = readJson(path.join(harmonyResources, 'element', 'string.json'));
  const harmonyColors = readJson(path.join(harmonyResources, 'element', 'color.json'));

  return {
    manifest: {
      bundleId: manifest.app?.identifiers?.bundleId,
      packageName: manifest.app?.identifiers?.packageName,
      version: manifest.release?.currentVersion,
      targetPlatforms: Array.isArray(manifest.runtime?.targetPlatforms)
        ? manifest.runtime.targetPlatforms
        : [],
    },
    pubspec: {
      version: firstMatch(/^version:\s*(.+)$/mu, pubspec),
    },
    hosts: {
      ios: fs.existsSync(path.join(appRoot, 'ios', 'Runner.xcodeproj', 'project.pbxproj')),
      android: fs.existsSync(path.join(appRoot, 'android', 'app', 'build.gradle.kts'))
        || fs.existsSync(path.join(appRoot, 'android', 'app', 'build.gradle')),
      harmony: fs.existsSync(path.join(appRoot, 'harmony', 'build-profile.json5'))
        && fs.existsSync(path.join(appRoot, 'harmony', 'entry', 'hvigorfile.ts')),
    },
    ios: {
      bundleIds: [...(pbxproj ?? '').matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/gu)]
        .map((match) => match[1].trim()),
      displayName: firstMatch(
        /<key>CFBundleDisplayName<\/key>\s*<string>([^<]*)<\/string>/u,
        infoPlist,
      ),
      shortVersion: firstMatch(
        /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]*)<\/string>/u,
        infoPlist,
      ),
      appIconFiles: fs.existsSync(appIconDir)
        ? fs.readdirSync(appIconDir).filter((name) => name.toLowerCase().endsWith('.png'))
        : [],
      targetedDeviceFamilies: [...(pbxproj ?? '').matchAll(/TARGETED_DEVICE_FAMILY = ([^;]+);/gu)]
        .flatMap((match) => match[1].replaceAll('"', '').split(','))
        .map((value) => value.trim())
        .filter(Boolean),
      appIconContents: Array.isArray(appIconContents?.images)
        ? appIconContents.images.map((image) => image?.filename).filter(Boolean)
        : [],
      has1024: fs.existsSync(path.join(appIconDir, 'Icon-App-1024x1024@1x.png')),
    },
    android: {
      applicationId: firstMatch(/applicationId\s*=\s*"([^"]+)"/u, androidGradle)
        ?? firstMatch(/applicationId\s+"([^"]+)"/u, androidGradle),
      mipmaps: ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'].filter((density) =>
        fs.existsSync(
          path.join(appRoot, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`, 'ic_launcher.png'),
        ),
      ),
    },
    harmony: {
      bundleName: harmonyApp?.app?.bundleName,
      versionName: harmonyApp?.app?.versionName,
      versionCode: harmonyApp?.app?.versionCode,
      modulePages: harmonyModule?.module?.pages,
      resourceRefs: collectHarmonyResourceRefs(harmonyModule),
      mainPages: Array.isArray(harmonyMainPages?.src) ? harmonyMainPages.src : [],
      strings: Array.isArray(harmonyStrings?.string)
        ? harmonyStrings.string.map((entry) => entry?.name)
        : [],
      colors: Array.isArray(harmonyColors?.color)
        ? harmonyColors.color.map((entry) => entry?.name)
        : [],
      hasEntryAbility: fs.existsSync(
        path.join(harmonyResources, '..', '..', 'ets', 'entryability', 'EntryAbility.ets'),
      ),
      resourcesDir: harmonyResources,
    },
  };
}

function collectHarmonyResourceRefs(module) {
  const refs = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'string' && /^\$(media|string|color|profile):/u.test(value)) {
      refs.push(value);
    }
  };
  visit(module);
  return [...new Set(refs)];
}

/** Validates collected facts; returns human-readable issues. */
export function validatePlatformHostFacts(facts) {
  const issues = [];
  const { manifest } = facts;
  if (manifest.bundleId !== MOBILE_BUNDLE_ID || manifest.packageName !== MOBILE_BUNDLE_ID) {
    issues.push(`agent.app.config.json: bundleId/packageName must be ${MOBILE_BUNDLE_ID}`);
  }
  if (!manifest.version) {
    issues.push('agent.app.config.json: release.currentVersion is required');
  }
  if (facts.pubspec.version !== manifest.version) {
    issues.push(`pubspec.yaml: version ${String(facts.pubspec.version)} must match release.currentVersion ${String(manifest.version)}`);
  }
  for (const host of ['ios', 'android', 'harmony']) {
    if (!facts.hosts[host]) {
      issues.push(`${host}: host project is missing`);
    }
  }

  const iosBundle = facts.ios.bundleIds.find((id) => !id.endsWith('.RunnerTests'))
    ?? facts.ios.bundleIds[0];
  if (iosBundle !== manifest.bundleId) {
    issues.push(`ios: PRODUCT_BUNDLE_IDENTIFIER ${String(iosBundle)} must be ${manifest.bundleId}`);
  }
  if (!facts.ios.displayName) {
    issues.push('ios: CFBundleDisplayName is required');
  }
  if (facts.ios.shortVersion !== '$(FLUTTER_BUILD_NAME)') {
    issues.push('ios: CFBundleShortVersionString must stay $(FLUTTER_BUILD_NAME) so pubspec drives the version');
  }
  if (!facts.ios.has1024) {
    issues.push('ios: AppIcon 1024x1024 is required for App Store submission');
  }
  const shipsIpad = facts.ios.targetedDeviceFamilies.includes('2');
  const declaresIpad = facts.manifest.targetPlatforms.includes('ipados');
  if (shipsIpad !== declaresIpad) {
    issues.push(
      `ios: TARGETED_DEVICE_FAMILY ${shipsIpad ? 'includes' : 'omits'} iPad but runtime.targetPlatforms ${
        declaresIpad ? 'declares' : 'omits'
      } ipados; the App Store shelf and the manifest must agree`,
    );
  }
  for (const filename of facts.ios.appIconContents) {
    if (!facts.ios.appIconFiles.includes(filename)) {
      issues.push(`ios: AppIcon Contents.json references missing ${filename}`);
    }
  }

  if (facts.android.applicationId !== manifest.packageName) {
    issues.push(`android: applicationId ${String(facts.android.applicationId)} must be ${manifest.packageName}`);
  }
  if (facts.android.mipmaps.length !== 5) {
    issues.push(`android: all five mipmap launcher icons are required (found ${facts.android.mipmaps.length})`);
  }

  if (facts.harmony.bundleName !== manifest.bundleId) {
    issues.push(`harmony: bundleName ${String(facts.harmony.bundleName)} must be ${manifest.bundleId}`);
  }
  if (facts.harmony.versionName !== manifest.version) {
    issues.push(`harmony: versionName ${String(facts.harmony.versionName)} must be ${manifest.version}`);
  }
  if (!Number.isInteger(facts.harmony.versionCode) || facts.harmony.versionCode < 1) {
    issues.push('harmony: versionCode must be a positive integer');
  }
  if (facts.harmony.modulePages !== '$profile:main_pages') {
    issues.push('harmony: module pages must reference $profile:main_pages');
  }
  if (!facts.harmony.hasEntryAbility) {
    issues.push('harmony: entryability/EntryAbility.ets is missing');
  }
  for (const page of facts.harmony.mainPages) {
    const file = path.join(facts.harmony.resourcesDir, '..', '..', 'ets', `${page}.ets`);
    if (!fs.existsSync(file)) {
      issues.push(`harmony: main_pages references missing ${page}.ets`);
    }
  }
  for (const ref of facts.harmony.resourceRefs) {
    issues.push(...validateHarmonyResourceRef(ref, facts.harmony));
  }
  return issues;
}

function validateHarmonyResourceRef(ref, harmony) {
  const [prefix, name] = ref.slice(1).split(':');
  const resources = harmony.resourcesDir;
  if (prefix === 'media') {
    const candidates = ['.png', '.jpg', '.svg', '.webp'].map((extension) => path.join(resources, 'media', `${name}${extension}`));
    return candidates.some((candidate) => fs.existsSync(candidate))
      ? []
      : [`harmony: module references missing media ${name}`];
  }
  if (prefix === 'string') {
    return harmony.strings.includes(name) ? [] : [`harmony: module references missing string ${name}`];
  }
  if (prefix === 'color') {
    return harmony.colors.includes(name) ? [] : [`harmony: module references missing color ${name}`];
  }
  if (prefix === 'profile') {
    return fs.existsSync(path.join(resources, 'profile', `${name}.json`))
      ? []
      : [`harmony: module references missing profile ${name}`];
  }
  return [];
}

/** Collects and validates the hosts of one app root. */
export function checkPlatformHost(appRoot) {
  return validatePlatformHostFacts(collectPlatformHostFacts(appRoot));
}
