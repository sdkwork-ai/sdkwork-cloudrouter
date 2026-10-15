import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { adminSiteSettingsMessages } from './packages/sdkwork-cloudrouter-pc-i18n/src/resources/admin/site-settings.ts';
import { sharedCommonMessages } from './packages/sdkwork-cloudrouter-pc-i18n/src/resources/shared/common.ts';
import { sharedNavigationMessages } from './packages/sdkwork-cloudrouter-pc-i18n/src/resources/shared/navigation.ts';
import {
  FOOTER_SECTIONS,
  SOCIAL_PLATFORMS,
} from './packages/sdkwork-cloudroutes-pc-commons/src/footer-settings.ts';
import { HOME_SECTIONS } from './packages/sdkwork-cloudrouter-pc-admin-site/src/siteContentFields.ts';

const PORTAL_ROOT = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const ADMIN_SITE_SOURCES = [
  path.join(PORTAL_ROOT, 'packages/sdkwork-cloudrouter-pc-admin-site/src/index.tsx'),
  // The download catalog editor and the shared controls are separate modules of the same page;
  // their t() calls are page copy and must pass the same existence check.
  path.join(PORTAL_ROOT, 'packages/sdkwork-cloudrouter-pc-admin-site/src/DownloadCatalogEditor.tsx'),
  path.join(PORTAL_ROOT, 'packages/sdkwork-cloudrouter-pc-admin-site/src/SiteSettingsControls.tsx'),
];
const ADMIN_SITE_SOURCE = ADMIN_SITE_SOURCES[0];
const CATEGORY_SOURCE = path.join(
  PORTAL_ROOT,
  'packages/sdkwork-cloudrouter-pc-admin-site/src/siteSettingsCategories.ts',
);

/**
 * Both bundles the page draws on, merged so a lookup mirrors what i18next resolves at runtime.
 * The page's sticky action bar borrows `common.actions.*` from the shared bundle, so checking
 * only the admin bundle would report those as missing.
 */
const BUNDLES = {
  en: { ...sharedCommonMessages.en, ...sharedNavigationMessages.en, ...adminSiteSettingsMessages.en },
  zh: { ...sharedCommonMessages.zh, ...sharedNavigationMessages.zh, ...adminSiteSettingsMessages.zh },
} as const;

/**
 * The four follow channels the site footer and `/admin/site` both talk about. They are the
 * same channel to an operator, so both surfaces must name them identically — a divergence
 * here means the operator configures one label and reads another in the published footer.
 */
const CHANNELS = [
  { adminFieldKey: 'admin.siteSettings.fields.officialAccountQrCode', footerKey: 'footer.qrcode.official' },
  { adminFieldKey: 'admin.siteSettings.fields.videoChannelQrCode', footerKey: 'footer.qrcode.videoChannel' },
  { adminFieldKey: 'admin.siteSettings.fields.douyinQrCode', footerKey: 'footer.qrcode.douyin' },
  { adminFieldKey: 'admin.siteSettings.fields.communityGroupQrCode', footerKey: 'footer.qrcode.group' },
] as const;

test('admin site settings translate every key into both required locales', () => {
  const en = adminSiteSettingsMessages.en;
  const zh = adminSiteSettingsMessages.zh;

  const onlyEn = Object.keys(en).filter((key) => !(key in zh)).sort();
  const onlyZh = Object.keys(zh).filter((key) => !(key in en)).sort();

  assert.deepEqual(onlyEn, [], 'admin.siteSettings keys missing from the Chinese bundle');
  assert.deepEqual(onlyZh, [], 'admin.siteSettings keys missing from the English bundle');
});

test('the four QR channels are named consistently on the admin page and in the footer', () => {
  const mismatch: string[] = [];

  for (const channel of CHANNELS) {
    for (const locale of ['en', 'zh'] as const) {
      // The admin page labels the artwork ("… QR code"), so the footer's channel noun must be a
      // prefix of the admin label once the trailing "QR code" wording is removed.
      const adminLabel = adminSiteSettingsMessages[locale][channel.adminFieldKey] as string;
      const footerLabel = sharedNavigationMessages[locale][channel.footerKey] as string;
      const adminNoun = adminLabel.replace(/\s*(QR code|二维码)$/u, '').trim();

      if (adminNoun !== footerLabel) {
        mismatch.push(`${locale}: ${channel.adminFieldKey}="${adminNoun}" vs ${channel.footerKey}="${footerLabel}"`);
      }
    }
  }

  assert.deepEqual(mismatch, [], `channel naming drifted between /admin/site and the footer:\n${mismatch.join('\n')}`);
});

test('every QR channel has a description in both locales', () => {
  const missing: string[] = [];

  for (const channel of CHANNELS) {
    const descriptionKey = channel.adminFieldKey.replace('fields.', 'qrCode.').replace('QrCode', '');
    for (const locale of ['en', 'zh'] as const) {
      const description = adminSiteSettingsMessages[locale][`${descriptionKey}.description`];
      if (typeof description !== 'string' || description.trim() === '') {
        missing.push(`${locale}: ${descriptionKey}.description`);
      }
    }
  }

  assert.deepEqual(missing, [], `missing QR channel descriptions:\n${missing.join('\n')}`);
});

/**
 * The tabs the page actually declares, read off the page rather than restated here.
 *
 * The list already lives in exactly one place — `SITE_SETTINGS_CATEGORIES` — and a second copy in
 * this file only guarantees the two agree until someone adds a tab. Deriving it means a new tab is
 * covered the moment it is written.
 */
function readDeclaredCategories(): string[] {
  const source = readFileSync(ADMIN_SITE_SOURCE, 'utf8');
  return [...source.matchAll(/labelKey: 'admin\.siteSettings\.categories\.([A-Za-z]+)\.label'/g)]
    .map((match) => match[1]);
}

/** Every module of the admin page whose literal t() calls must resolve. */
function readAdminSiteSources(): string {
  return ADMIN_SITE_SOURCES.map((file) => readFileSync(file, 'utf8')).join('\n');
}

/**
 * The registry-driven half of the sidebar.
 *
 * Category labels, platform names, footer-region labels and homepage-region labels are never
 * written as a literal `t('…')` call — they are handed to `t()` through a table — so nothing in the
 * source tells a reader whether the key exists. A typo here publishes the raw key
 * (`footer.socialPlatform.weibo`) into the operator's sidebar instead of a name, which is exactly
 * the failure this locks out.
 */
test('every category, platform, footer region and homepage region label resolves in both locales', () => {
  const wanted: string[] = [];
  const categories = readDeclaredCategories();
  assert.ok(categories.length >= 9, `expected the page to declare its tabs, saw ${categories.length}`);
  assert.equal(new Set(categories).size, categories.length, 'a tab is declared twice');

  for (const category of categories) {
    wanted.push(
      `admin.siteSettings.categories.${category}.label`,
      `admin.siteSettings.categories.${category}.description`,
    );
  }
  wanted.push('admin.siteSettings.categories.ariaLabel');
  for (const platform of SOCIAL_PLATFORMS) wanted.push(platform.labelKey);
  for (const section of FOOTER_SECTIONS) wanted.push(section.labelKey, section.descriptionKey);
  // `HOME_SECTIONS` drives the homepage region switches the same way `FOOTER_SECTIONS` drives the
  // footer ones: the labels are looked up through the table, so nothing else can check them.
  for (const section of HOME_SECTIONS) {
    wanted.push(section.labelKey, section.descriptionKey);
  }

  assert.ok(wanted.length > 30, 'expected a substantial set of registry-driven keys');
  assert.equal(new Set(wanted).size, wanted.length, 'a registry hands the same key to t() twice');

  for (const locale of ['en', 'zh'] as const) {
    const bundle = BUNDLES[locale] as Record<string, unknown>;
    const missing = wanted.filter((key) => typeof bundle[key] !== 'string' || String(bundle[key]).trim() === '');
    assert.deepEqual(missing, [], `${locale} is missing registry-driven keys:\n${missing.join('\n')}`);
  }
});

/**
 * The homepage warnings are looked up through `WARNING_LABEL_KEYS`, not a literal `t('…')` call,
 * so the scan below cannot see them either. The table's completeness is a compile-time property
 * (`Record<HomeContentWarningCode, string>`); that the *keys* exist is not.
 */
test('every homepage warning the console can raise has a sentence in both locales', () => {
  const source = readAdminSiteSources();
  const keys = [
    ...source.matchAll(/'(admin\.siteSettings\.homeContent\.warning\.[A-Za-z]+)'/g),
  ].map((match) => match[1]);

  assert.ok(keys.length >= 7, `expected a warning per incomplete-entry kind, saw ${keys.length}`);
  assert.equal(new Set(keys).size, keys.length, 'a warning key is written twice');

  for (const locale of ['en', 'zh'] as const) {
    const bundle = BUNDLES[locale] as Record<string, unknown>;
    const missing = keys.filter((key) => typeof bundle[key] !== 'string' || String(bundle[key]).trim() === '');
    assert.deepEqual(missing, [], `${locale} is missing homepage warning keys:\n${missing.join('\n')}`);
  }
});

/**
 * The download editor's warnings are looked up through a `Record<DownloadCatalogWarningCode,
 * string>` table the same way the homepage warnings are, so the scan cannot see them either.
 */
test('every download catalog warning the console can raise has a sentence in both locales', () => {
  const source = readFileSync(
    path.join(PORTAL_ROOT, 'packages/sdkwork-cloudrouter-pc-admin-site/src/DownloadCatalogEditor.tsx'),
    'utf8',
  );
  const keys = [
    ...source.matchAll(/'(admin\.siteSettings\.downloads\.warning\.[A-Za-z]+)'/g),
  ].map((match) => match[1]);

  assert.ok(keys.length >= 5, `expected a warning per incomplete-catalog kind, saw ${keys.length}`);
  assert.equal(new Set(keys).size, keys.length, 'a warning key is written twice');

  for (const locale of ['en', 'zh'] as const) {
    const bundle = BUNDLES[locale] as Record<string, unknown>;
    const missing = keys.filter((key) => typeof bundle[key] !== 'string');
    assert.deepEqual(missing, [], `${locale} is missing download warning keys:\n${missing.join('\n')}`);
  }
});

/**
 * Every literal `t('…')` the page or its category table contains must exist. This is the cheap,
 * mechanical half of the same concern: a renamed key would otherwise silently render as itself.
 */
test('no t() call on the admin site page references an undefined key', () => {
  const referenced = new Set<string>();
  for (const match of readAdminSiteSources().matchAll(/\bt\(\s*'([^']+)'/g)) {
    referenced.add(match[1]);
  }
  for (const match of readFileSync(CATEGORY_SOURCE, 'utf8').matchAll(/\bt\(\s*'([^']+)'/g)) {
    referenced.add(match[1]);
  }
  assert.ok(referenced.size > 20, `expected the page to reference many keys, saw ${referenced.size}`);

  for (const locale of ['en', 'zh'] as const) {
    const bundle = BUNDLES[locale] as Record<string, unknown>;
    const missing = [...referenced].filter((key) => typeof bundle[key] !== 'string').sort();
    assert.deepEqual(missing, [], `${locale} is missing keys the page calls t() with:\n${missing.join('\n')}`);
  }
});


/**
 * The shared upload chrome both editors render ships English defaults (DriveUploadImage's
 * pick/retry/uploading strings, BusinessStatePanel's retry label). The page must override all of
 * them, otherwise a Chinese operator reads English chrome.
 */
test('the admin site page overrides the shared components English default chrome', () => {
  const source = readAdminSiteSources();
  const problems: string[] = [];

  const imageUploadTags = source.match(/<DriveUploadImage\b[\s\S]*?\/>/g) ?? [];
  assert.ok(imageUploadTags.length > 0, 'expected the admin site page to render DriveUploadImage');
  for (const tag of imageUploadTags) {
    // `copy` carries the component's own chrome (pick/remove/retry/uploading strings) and
    // `label` becomes the file input's accessible name; omitting either publishes the English
    // default to sighted and assistive-technology users on a Chinese page.
    for (const prop of ['copy', 'label']) {
      if (!tag.includes(prop)) {
        problems.push(`DriveUploadImage is missing ${prop}`);
      }
    }
  }

  const statePanelTags = source.match(/<BusinessStatePanel\b[\s\S]*?\/>/g) ?? [];
  assert.ok(statePanelTags.length > 0, 'expected the admin site page to render BusinessStatePanel');
  for (const tag of statePanelTags) {
    if (tag.includes('onRetry') && !tag.includes('retryLabel')) {
      problems.push('BusinessStatePanel passes onRetry without retryLabel');
    }
  }

  assert.deepEqual(problems, [], `untranslated shared-component chrome:\n${problems.join('\n')}`);
});
