/**
 * Per-store publishing configuration for the Flutter mobile application.
 *
 * One JSON document per app market lives in `etc/store-publishing/`. The
 * document owns everything that is specific to that market: identity, listing
 * copy, release track, rollout countries, credential *references*, artifact
 * mapping and the media it consumes. Nothing is shared implicitly: a Google
 * Play change can never alter the App Store lane.
 *
 * This module validates those documents, projects them into
 * `agent.app.config.json` (`publish.stores`, `release.notes[].metadata
 * .marketReleases`) and derives the store-tagged media entries from the real
 * capture files. `sync-store-publishing.mjs` owns the write; the check and
 * capture scripts only read.
 *
 * Authority:
 * - APP_MANIFEST_SPEC.md section 8 / 13 (store lanes, market releases)
 * - APP_ASSETS_SPEC.md section 8 (store submission profiles)
 * - `../sdkwork-specs/schemas/sdkwork.app-assets.profiles.v1.json`
 */
import fs from 'node:fs';
import path from 'node:path';

export const STORE_CONFIG_SCHEMA = 1;
export const STORE_CONFIG_KIND = 'sdkwork.app.store-publishing';
export const CATALOG_STANDARD = 'sdkwork-app-assets.v1';

/**
 * Market rules the schema cannot express because they are product decisions.
 *
 * `requiresChina` / `forbidsChina` encode the China-US regression: Apple and
 * Huawei own the mainland China lane, Google Play does not distribute there,
 * and every market must reach the United States.
 */
export const MARKET_RULES = {
  APPLE_APP_STORE: {
    platforms: ['ios'],
    allowedTracks: ['APP_STORE', 'TESTFLIGHT'],
    requiresChina: true,
    requiresUnitedStates: true,
  },
  GOOGLE_PLAY: {
    platforms: ['android'],
    allowedTracks: ['INTERNAL', 'ALPHA', 'BETA', 'PRODUCTION'],
    forbidsChina: true,
    requiresUnitedStates: true,
  },
  HUAWEI_APPGALLERY: {
    platforms: ['android', 'harmony'],
    allowedTracks: ['DRAFT', 'REVIEW', 'RELEASED'],
    requiresChina: true,
    requiresUnitedStates: true,
  },
};

/** Catalog shelves derived from the shipped platform set. */
export const CATALOG_FAMILIES = [
  {
    family: 'ios',
    platform: 'APP_IOS',
    deviceClass: 'IPHONE',
    displayType: 'IPHONE_6_9',
    root: 'assets/media/store/screenshots/ios',
  },
  {
    family: 'android',
    platform: 'APP_ANDROID',
    deviceClass: 'ANDROID_PHONE',
    displayType: 'ANDROID_PHONE',
    root: 'assets/media/store/screenshots/android',
  },
  {
    family: 'harmony',
    platform: 'APP_HARMONY',
    deviceClass: 'HARMONY_PHONE',
    displayType: 'HARMONY_PHONE',
    root: 'assets/media/store/screenshots/harmony',
  },
  {
    family: 'mobile',
    platform: 'APP',
    deviceClass: 'MOBILE',
    displayType: 'MOBILE_9_16',
    root: 'assets/media/store/screenshots/mobile',
  },
];

/** Screens the capture harness writes into every shelf directory. */
export const CAPTURE_SCREENS = ['home', 'messages', 'playground', 'profile', 'settings'];

const SCREEN_ALT_TEXT = {
  home: '首页：算力与模型服务总览，包含搜索、常用入口与服务列表',
  messages: '消息：与设计、运维和产品助手的会话列表',
  playground: '体验中心：与 AI 助手实时对话',
  profile: '个人中心：账户、会员与设置入口',
  settings: '设置：外观、语音、通知与关于',
};

const COVER_ALT_TEXT = 'SDKWork CloudRouter 品牌封面：手机界面与品牌标识';
const FEATURE_GRAPHIC_ALT_TEXT = 'SDKWork CloudRouter 谷歌商店横幅：算力与模型，一站式上云';

const PLATFORM_TO_MANIFEST = {
  android: 'APP_ANDROID',
  harmony: 'APP_HARMONY',
  ios: 'APP_IOS',
};

const STORE_URL_BY_MARKET = {
  GOOGLE_PLAY: (config) =>
    `https://play.google.com/store/apps/details?id=${config.identifiers.applicationId}`,
};

export function resolveSpecsRoot(appRoot) {
  if (process.env.SDKWORK_SPECS_ROOT?.trim()) {
    return path.resolve(process.env.SDKWORK_SPECS_ROOT.trim());
  }
  return path.resolve(appRoot, '..', '..', '..', 'sdkwork-specs');
}

export function loadStoreProfiles(specsRoot = resolveSpecsRoot(process.cwd())) {
  const file = path.join(specsRoot, 'schemas', 'sdkwork.app-assets.profiles.v1.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')).profiles;
}

export function storeConfigDir(appRoot) {
  return path.join(appRoot, 'etc', 'store-publishing');
}

export function loadStoreConfigs(appRoot) {
  const dir = storeConfigDir(appRoot);
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'capture.json')
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => ({
      file: path.join(dir, entry.name),
      relativeFile: path.relative(appRoot, path.join(dir, entry.name)).replaceAll('\\', '/'),
      config: JSON.parse(fs.readFileSync(path.join(dir, entry.name), 'utf8')),
    }));
}

export function loadCaptureMetadata(appRoot) {
  const file = path.join(storeConfigDir(appRoot), 'capture.json');
  if (!fs.existsSync(file)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Reads a PNG's pixel size and whether it carries an alpha channel. */
export function readPngFacts(buffer) {
  if (buffer.length < 26 || buffer.readUInt32BE(0) !== 0x89504e47) {
    return undefined;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer.readUInt8(24);
  const colorType = buffer.readUInt8(25);
  return {
    width,
    height,
    bitDepth,
    colorType,
    hasAlpha: colorType === 4 || colorType === 6,
  };
}

function imageFacts(filePath) {
  const buffer = fs.readFileSync(filePath);
  const png = readPngFacts(buffer);
  if (!png) {
    return undefined;
  }
  return { ...png, fileSizeBytes: buffer.length };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isoCountry(value) {
  return typeof value === 'string' && /^[A-Z]{2}$/u.test(value);
}

/**
 * Validates every per-store document and the media it consumes.
 * @returns {string[]} human-readable issues; empty means the lanes are ready.
 */
export function validateStoreConfigs({ appRoot, configs, profiles, manifest }) {
  const issues = [];
  if (configs.length === 0) {
    issues.push('etc/store-publishing has no store configuration');
    return issues;
  }
  const seenMarkets = new Set();
  const platformUnion = new Set();
  const countryUnion = new Set();

  for (const { relativeFile, config } of configs) {
    const label = relativeFile;
    if (!isObject(config)) {
      issues.push(`${label}: store configuration must be an object`);
      continue;
    }
    if (config.schemaVersion !== STORE_CONFIG_SCHEMA) {
      issues.push(`${label}: schemaVersion must be ${STORE_CONFIG_SCHEMA}`);
    }
    if (config.kind !== STORE_CONFIG_KIND) {
      issues.push(`${label}: kind must be ${STORE_CONFIG_KIND}`);
    }
    const marketId = config.marketId;
    const rule = MARKET_RULES[marketId];
    if (!rule) {
      issues.push(`${label}: marketId ${String(marketId)} has no market rule`);
      continue;
    }
    if (!profiles[marketId]) {
      issues.push(`${label}: ${marketId} has no store media profile`);
    }
    if (seenMarkets.has(marketId)) {
      issues.push(`${label}: duplicate marketId ${marketId}`);
      continue;
    }
    seenMarkets.add(marketId);
    if (config.enabled !== true) {
      issues.push(`${label}: enabled must be true for a shipped lane`);
    }

    const platforms = Array.isArray(config.platforms) ? config.platforms : [];
    if (platforms.length === 0) {
      issues.push(`${label}: platforms must list at least one delivery platform`);
    }
    for (const platform of platforms) {
      if (!rule.platforms.includes(platform)) {
        issues.push(`${label}: ${marketId} cannot publish ${String(platform)} (allowed: ${rule.platforms.join(', ')})`);
      }
      platformUnion.add(platform);
    }

    const release = isObject(config.release) ? config.release : {};
    if (!rule.allowedTracks.includes(release.track)) {
      issues.push(`${label}: release.track ${String(release.track)} is not allowed for ${marketId}`);
    }
    if (!Number.isInteger(release.rolloutPercent) || release.rolloutPercent < 1 || release.rolloutPercent > 100) {
      issues.push(`${label}: release.rolloutPercent must be 1..100`);
    }
    if (!isNonEmptyString(release.minSupportedVersion)) {
      issues.push(`${label}: release.minSupportedVersion is required`);
    }
    const countries = Array.isArray(release.countries) ? release.countries : [];
    if (countries.length === 0) {
      issues.push(`${label}: release.countries must list at least one country`);
    }
    for (const country of countries) {
      if (!isoCountry(country)) {
        issues.push(`${label}: ${String(country)} is not an ISO 3166-1 alpha-2 country`);
      }
      countryUnion.add(country);
    }
    if (rule.requiresChina && !countries.includes('CN')) {
      issues.push(`${label}: ${marketId} must include CN in release.countries`);
    }
    if (rule.forbidsChina && countries.includes('CN')) {
      issues.push(`${label}: ${marketId} does not distribute in mainland China; CN must not be listed`);
    }
    if (rule.requiresUnitedStates && !countries.includes('US')) {
      issues.push(`${label}: ${marketId} must include US in release.countries`);
    }

    validateListing(label, config, issues);
    validateSubmission(label, config, rule, issues);
    validateMedia({ appRoot, label, config, profiles, issues });
  }

  if (!platformUnion.has('ios')) {
    issues.push('store lanes do not cover iOS');
  }
  if (!platformUnion.has('android')) {
    issues.push('store lanes do not cover Android');
  }
  if (!platformUnion.has('harmony')) {
    issues.push('store lanes do not cover HarmonyOS');
  }
  if (!countryUnion.has('CN')) {
    issues.push('store lanes do not cover mainland China');
  }
  if (!countryUnion.has('US')) {
    issues.push('store lanes do not cover the United States');
  }

  return issues;
}

function validateListing(label, config, issues) {
  const listing = isObject(config.listing) ? config.listing : {};
  const locales = isObject(listing.locales) ? listing.locales : {};
  if (!isNonEmptyString(listing.defaultLocale)) {
    issues.push(`${label}: listing.defaultLocale is required`);
  } else if (!locales[listing.defaultLocale]) {
    issues.push(`${label}: listing.defaultLocale ${listing.defaultLocale} has no copy`);
  }
  for (const locale of ['zh-CN', 'en-US']) {
    if (!isObject(locales[locale]) || !isNonEmptyString(locales[locale].name)) {
      issues.push(`${label}: listing.locales.${locale}.name is required`);
    }
  }
  for (const key of ['supportUrl', 'privacyPolicyUrl']) {
    if (!isNonEmptyString(listing[key]) || !/^https:\/\//u.test(listing[key])) {
      issues.push(`${label}: listing.${key} must be an HTTPS URL`);
    }
  }
  const categories = isObject(listing.categories) ? listing.categories : {};
  if (!isNonEmptyString(categories.primary)) {
    issues.push(`${label}: listing.categories.primary is required`);
  }
}

function validateSubmission(label, config, rule, issues) {
  const submission = isObject(config.submission) ? config.submission : {};
  if (!['automated', 'manual'].includes(submission.mode)) {
    issues.push(`${label}: submission.mode must be automated or manual`);
  }
  if (!isNonEmptyString(submission.transport)) {
    issues.push(`${label}: submission.transport is required`);
  }
  const refs = isObject(submission.credentialRefs) ? submission.credentialRefs : {};
  const refValues = Object.values(refs);
  if (refValues.length === 0) {
    issues.push(`${label}: submission.credentialRefs must name at least one credential`);
  }
  for (const [name, value] of Object.entries(refs)) {
    if (typeof value !== 'string' || !/^(env|secret):[A-Z0-9_]+$/u.test(value)) {
      issues.push(`${label}: submission.credentialRefs.${name} must be env:NAME or secret:NAME, never a literal secret`);
    }
  }
  const targets = Array.isArray(submission.targets)
    ? submission.targets
    : Array.isArray(submission.artifacts)
      ? submission.artifacts
      : submission.artifact
        ? [submission.artifact]
        : [];
  if (targets.length === 0) {
    issues.push(`${label}: submission.targets must map the market to build artifacts`);
  }
  const targetIds = new Set();
  for (const target of targets) {
    if (isNonEmptyString(target?.id)) {
      if (targetIds.has(target.id)) {
        issues.push(`${label}: duplicate submission target ${target.id}`);
      }
      targetIds.add(target.id);
    }
    if (!rule.platforms.includes(target?.platform)) {
      issues.push(`${label}: submission target platform ${String(target?.platform)} is not published by ${config.marketId}`);
    }
    if (!['AAB', 'APK', 'IPA', 'HAP'].includes(target?.packageFormat)) {
      issues.push(`${label}: submission target packageFormat must be AAB, APK, IPA or HAP`);
    }
    if (!isNonEmptyString(target?.artifactName)) {
      issues.push(`${label}: submission target artifactName is required`);
    }
  }
}

function validateMedia({ appRoot, label, config, profiles, issues }) {
  const marketId = config.marketId;
  const profile = profiles[marketId];
  if (!profile) {
    return;
  }
  const media = isObject(config.media) ? config.media : {};
  const icon = isNonEmptyString(media.icon) ? media.icon : undefined;
  if (!icon) {
    issues.push(`${label}: media.icon is required`);
  } else {
    validateImageAgainstRole({ appRoot, label, relativePath: icon, role: 'ICON', profile, issues });
  }
  if (isNonEmptyString(media.featureGraphic)) {
    validateImageAgainstRole({
      appRoot,
      label,
      relativePath: media.featureGraphic,
      role: 'FEATURE_GRAPHIC',
      profile,
      issues,
    });
  } else if (profile.assets?.FEATURE_GRAPHIC?.required) {
    issues.push(`${label}: media.featureGraphic is required by ${marketId}`);
  }
  const screenshotGroups = Array.isArray(media.screenshots) ? media.screenshots : [];
  if (screenshotGroups.length === 0) {
    issues.push(`${label}: media.screenshots must declare at least one shelf`);
  }
  for (const platform of config.platforms ?? []) {
    const token = PLATFORM_TO_MANIFEST[platform];
    if (token && !screenshotGroups.some((group) => group?.platform === token)) {
      issues.push(`${label}: no screenshot shelf for ${token}`);
    }
  }
  let foundScreenshots = 0;
  for (const group of screenshotGroups) {
    if (!isNonEmptyString(group?.root)) {
      issues.push(`${label}: media.screenshots[].root is required`);
      continue;
    }
    const absoluteRoot = path.join(appRoot, group.root);
    if (!fs.existsSync(absoluteRoot)) {
      issues.push(`${label}: media.screenshots root ${group.root} does not exist`);
      continue;
    }
    const files = fs
      .readdirSync(absoluteRoot)
      .filter((name) => name.toLowerCase().endsWith('.png'))
      .sort();
    const facts = files.map((name) => ({
      name,
      ...imageFacts(path.join(absoluteRoot, name)),
    }));
    foundScreenshots += facts.length;
    const screenshotProfile = profile.assets?.SCREENSHOT;
    if (!screenshotProfile) {
      continue;
    }
    if (facts.length < (screenshotProfile.min ?? 1)) {
      issues.push(`${label}: ${group.root} has ${facts.length} screenshot(s); ${marketId} requires at least ${screenshotProfile.min}`);
    }
    if (screenshotProfile.max !== undefined && facts.length > screenshotProfile.max) {
      issues.push(`${label}: ${group.root} has ${facts.length} screenshot(s); ${marketId} allows at most ${screenshotProfile.max}`);
    }
    for (const fact of facts) {
      validateScreenshotFacts({ label, marketId, fact, config: screenshotProfile, issues });
    }
    const groupRule = screenshotProfile.groups?.[group.displayType];
    if (groupRule?.sizes) {
      const matches = facts.filter((fact) =>
        groupRule.sizes.some(([width, height]) => width === fact.width && height === fact.height),
      );
      if (matches.length < (groupRule.min ?? 1)) {
        issues.push(
          `${label}: ${group.root} has no screenshot at an accepted ${group.displayType} size`,
        );
      }
    }
  }
  if (foundScreenshots === 0) {
    issues.push(`${label}: no store screenshots were found`);
  }
}

function validateImageAgainstRole({ appRoot, label, relativePath, role, profile, issues }) {
  const config = profile.assets?.[role];
  if (!config) {
    issues.push(`${label}: ${profile.displayName ?? 'store'} profile has no ${role} check`);
    return;
  }
  const absolute = path.join(appRoot, relativePath);
  if (!fs.existsSync(absolute)) {
    issues.push(`${label}: ${relativePath} does not exist`);
    return;
  }
  const facts = imageFacts(absolute);
  if (!facts) {
    issues.push(`${label}: ${relativePath} is not a PNG`);
    return;
  }
  if (config.exactSizes) {
    const accepted = config.exactSizes.some(([width, height]) => width === facts.width && height === facts.height);
    if (!accepted) {
      const sizes = config.exactSizes.map(([width, height]) => `${width}x${height}`).join(' or ');
      issues.push(`${label}: ${relativePath} is ${facts.width}x${facts.height}; ${profile.displayName} requires ${sizes}`);
    }
  }
  if (config.alpha === false && facts.hasAlpha) {
    issues.push(`${label}: ${relativePath} must not carry an alpha channel`);
  }
}

function validateScreenshotFacts({ label, marketId, fact, config, issues }) {
  if (!fact || !fact.width) {
    issues.push(`${label}: ${fact.name} is not a readable PNG`);
    return;
  }
  const minSide = Math.min(fact.width, fact.height);
  const maxSide = Math.max(fact.width, fact.height);
  if (config.minSide !== undefined && minSide < config.minSide) {
    issues.push(`${label}: ${fact.name} short side ${minSide} < ${config.minSide} required by ${marketId}`);
  }
  if (config.maxSide !== undefined && maxSide > config.maxSide) {
    issues.push(`${label}: ${fact.name} long side ${maxSide} > ${config.maxSide} allowed by ${marketId}`);
  }
  if (config.maxAspect !== undefined && maxSide / minSide > config.maxAspect) {
    issues.push(`${label}: ${fact.name} aspect ${(maxSide / minSide).toFixed(2)} exceeds ${config.maxAspect}`);
  }
  if (config.alpha === false && fact.hasAlpha) {
    issues.push(`${label}: ${fact.name} must not carry an alpha channel`);
  }
}

export function validateManifestAlignment(manifest, configs, issues = []) {
  if (!manifest) {
    return issues;
  }
  const platforms = new Set(manifest.publish?.platforms ?? []);
  for (const { config } of configs) {
    for (const platform of config.platforms ?? []) {
      const token = PLATFORM_TO_MANIFEST[platform];
      if (token && !platforms.has(token)) {
        issues.push(`agent.app.config.json: publish.platforms must include ${token} for ${config.marketId}`);
      }
    }
  }
  const targets = new Set(manifest.runtime?.targetPlatforms ?? []);
  for (const platform of ['ios', 'android', 'harmony']) {
    if (!targets.has(platform)) {
      issues.push(`agent.app.config.json: runtime.targetPlatforms must include ${platform}`);
    }
  }
  if (targets.has('ipados')) {
    issues.push('agent.app.config.json: runtime.targetPlatforms must not declare ipados while the app ships iPhone-only');
  }
  return issues;
}

/** Builds the `publish.stores[]` lanes from the per-store documents. */
export function buildStoreLanes({ configs, specsRoot }) {
  const profiles = loadStoreProfiles(specsRoot);
  return configs.map(({ config, relativeFile }) => {
    const profile = profiles[config.marketId];
    const storeUrl = config.storeUrl ?? STORE_URL_BY_MARKET[config.marketId]?.(config);
    return {
      marketId: config.marketId,
      displayName: config.displayName ?? profile?.displayName ?? config.marketId,
      storeId:
        config.identifiers?.bundleId
        ?? config.identifiers?.applicationId
        ?? config.identifiers?.harmonyBundleName
        ?? '',
      platforms: (config.platforms ?? []).map((platform) => PLATFORM_TO_MANIFEST[platform]).filter(Boolean),
      countries: config.release?.countries ?? [],
      track: config.release?.track,
      status: profile ? 'READY' : 'PENDING_PROFILE',
      defaultLocale: config.listing?.defaultLocale,
      configRef: relativeFile,
      ...(storeUrl ? { storeUrl } : {}),
    };
  });
}

/** Builds the version-specific `release.notes[].metadata.marketReleases[]`. */
export function buildMarketReleases({ configs, version }) {
  return configs.map(({ config }) => ({
    releaseVersion: version,
    marketId: config.marketId,
    track: config.release?.track,
    status: 'PENDING_SUBMISSION',
    rolloutPercent: config.release?.rolloutPercent ?? 100,
    countries: config.release?.countries ?? [],
    minSupportedVersion: config.release?.minSupportedVersion,
    forceUpdate: false,
  }));
}

/** Media projection: catalog shelf plus one tagged set per store. */
export function buildMediaProjection({ appRoot, configs, version, capture }) {
  const capturedAt = capture?.capturedAt;
  const tool = capture?.tool ?? 'flutter-widget-test';
  if (!isNonEmptyString(capturedAt)) {
    throw new Error('etc/store-publishing/capture.json requires capturedAt');
  }
  const screenshots = [];
  const icons = [];
  const previews = [];
  const pushScreenshot = ({
    id,
    relativePath,
    platform,
    deviceClass,
    displayType,
    storePlatform,
    purpose,
    sortOrder,
    altText,
  }) => {
    const absolute = path.join(appRoot, relativePath);
    if (!fs.existsSync(absolute)) {
      return;
    }
    const facts = imageFacts(absolute);
    if (!facts) {
      return;
    }
    screenshots.push({
      id,
      type: 'SCREENSHOT',
      purpose,
      platform,
      deviceClass,
      displayType,
      locale: 'zh-CN',
      width: facts.width,
      height: facts.height,
      format: 'PNG',
      fileSizeBytes: facts.fileSizeBytes,
      alphaChannel: facts.hasAlpha,
      enabled: true,
      path: relativePath,
      sortOrder,
      ...(storePlatform ? { storePlatform } : {}),
      metadata: {
        altText,
        capture: { appVersion: version, capturedAt, tool },
      },
    });
  };

  for (const family of CATALOG_FAMILIES) {
    for (const [index, screen] of CAPTURE_SCREENS.entries()) {
      pushScreenshot({
        id: `catalog-${family.family}-${screen}`,
        relativePath: `${family.root}/${screen}.png`,
        platform: family.platform,
        deviceClass: family.deviceClass,
        displayType: family.displayType,
        purpose: 'CATALOG_SCREENSHOT',
        sortOrder: index,
        altText: SCREEN_ALT_TEXT[screen],
      });
    }
  }

  for (const { config } of configs) {
    const slug = config.marketId.toLowerCase().replaceAll('_', '-');
    const media = config.media ?? {};
    const iconPath = media.icon;
    if (isNonEmptyString(iconPath)) {
      const absolute = path.join(appRoot, iconPath);
      if (fs.existsSync(absolute)) {
        const facts = imageFacts(absolute);
        if (facts) {
          icons.push({
            id: `${slug}-icon`,
            type: 'ICON',
            purpose: 'STORE_LISTING',
            platform: PLATFORM_TO_MANIFEST[(config.platforms ?? [])[0]],
            locale: 'zh-CN',
            width: facts.width,
            height: facts.height,
            format: 'PNG',
            fileSizeBytes: facts.fileSizeBytes,
            alphaChannel: facts.hasAlpha,
            enabled: true,
            path: iconPath,
            storePlatform: config.marketId,
            metadata: { altText: `${config.displayName ?? config.marketId} 应用图标` },
          });
        }
      }
    }
    if (isNonEmptyString(media.featureGraphic)) {
      const absolute = path.join(appRoot, media.featureGraphic);
      if (fs.existsSync(absolute)) {
        const facts = imageFacts(absolute);
        if (facts) {
          previews.push({
            id: `${slug}-feature-graphic`,
            type: 'FEATURE_GRAPHIC',
            purpose: 'FEATURE_GRAPHIC',
            platform: 'APP_ANDROID',
            locale: 'zh-CN',
            width: facts.width,
            height: facts.height,
            format: 'PNG',
            fileSizeBytes: facts.fileSizeBytes,
            alphaChannel: facts.hasAlpha,
            enabled: true,
            path: media.featureGraphic,
            storePlatform: config.marketId,
            sortOrder: 1,
            metadata: { altText: FEATURE_GRAPHIC_ALT_TEXT },
          });
        }
      }
    }
    for (const group of media.screenshots ?? []) {
      const platformKey = String(group.platform ?? '').toLowerCase().replace('app_', '');
      const prefix = `${slug}-${platformKey}`;
      for (const [index, screen] of CAPTURE_SCREENS.entries()) {
        pushScreenshot({
          id: `${prefix}-${screen}`,
          relativePath: `${group.root}/${screen}.png`,
          platform: group.platform,
          deviceClass: group.deviceClass,
          displayType: group.displayType,
          storePlatform: config.marketId,
          purpose: 'STORE_SUBMISSION',
          sortOrder: index,
          altText: SCREEN_ALT_TEXT[screen],
        });
      }
    }
  }

  const coverPath = 'assets/media/covers/catalog-cover-1920x1080.png';
  if (fs.existsSync(path.join(appRoot, coverPath))) {
    const facts = imageFacts(path.join(appRoot, coverPath));
    if (facts) {
      previews.push({
        id: 'catalog-cover-zh-cn',
        type: 'COVER',
        purpose: 'CATALOG_COVER',
        platform: 'APP',
        locale: 'zh-CN',
        width: facts.width,
        height: facts.height,
        format: 'PNG',
        fileSizeBytes: facts.fileSizeBytes,
        alphaChannel: facts.hasAlpha,
        enabled: true,
        path: coverPath,
        sortOrder: 0,
        metadata: { altText: COVER_ALT_TEXT },
      });
    }
  }

  screenshots.sort((left, right) => left.id.localeCompare(right.id));
  icons.sort((left, right) => left.id.localeCompare(right.id));
  previews.sort((left, right) => left.sortOrder - right.sortOrder);

  let primaryIcon;
  const primaryIconPath = 'assets/media/icons/app-icon-1024.png';
  if (fs.existsSync(path.join(appRoot, primaryIconPath))) {
    const facts = imageFacts(path.join(appRoot, primaryIconPath));
    if (facts) {
      primaryIcon = {
        id: 'catalog-app-icon-1024',
        type: 'ICON',
        purpose: 'PRIMARY',
        platform: 'APP',
        locale: 'zh-CN',
        width: facts.width,
        height: facts.height,
        format: 'PNG',
        fileSizeBytes: facts.fileSizeBytes,
        alphaChannel: facts.hasAlpha,
        enabled: true,
        path: primaryIconPath,
        metadata: {
          source: 'apps/sdkwork-cloudrouter-pc/public/apple-touch-icon.png',
          generatedBy: 'scripts/generate-store-images.py',
        },
      };
    }
  }
  return { primaryIcon, icons, previews, screenshots };
}

/** Complete manifest projection the sync command writes. */
export function buildManifestProjection({ appRoot, specsRoot, manifest }) {
  const configs = loadStoreConfigs(appRoot);
  const profiles = loadStoreProfiles(specsRoot);
  const issues = validateStoreConfigs({ appRoot, configs, profiles, manifest });
  const version = manifest?.release?.currentVersion ?? '0.0.0';
  const capture = loadCaptureMetadata(appRoot);
  const media = buildMediaProjection({ appRoot, configs, version, capture });
  return {
    issues,
    capture,
    stores: buildStoreLanes({ configs, specsRoot }),
    marketReleases: buildMarketReleases({ configs, version }),
    media,
  };
}
