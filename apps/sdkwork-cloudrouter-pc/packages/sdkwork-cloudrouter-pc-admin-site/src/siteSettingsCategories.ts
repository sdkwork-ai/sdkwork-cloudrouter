import {
  FOOTER_SECTIONS,
  SOCIAL_PLATFORMS,
  socialPlatformFieldNames,
} from '@sdkwork/cloudroutes-pc-commons/footer-settings';
import {
  DEFAULT_SITE_SETTINGS,
  siteSettingsI18nFieldFor,
  type SiteSettingsCopyField,
  type SiteSettingsForm,
} from './SiteSettingsService';

/**
 * The `/admin/site` page is organised as a vertical tab list. This module owns the mapping from
 * each tab to the form fields it renders; the page owns how a tab looks.
 *
 * Keeping the mapping here — free of React — is what makes "did we forget to surface a field?"
 * a testable question instead of a manual audit.
 */
export type SiteSettingsCategoryId =
  | 'identity'
  | 'assets'
  | 'theme'
  | 'homepage'
  | 'downloads'
  | 'social'
  | 'qrCodes'
  | 'footerLayout'
  | 'links';

export const SITE_SETTINGS_CATEGORY_IDS: readonly SiteSettingsCategoryId[] = [
  'identity',
  'assets',
  'theme',
  'homepage',
  'downloads',
  'social',
  'qrCodes',
  'footerLayout',
  'links',
];

const SOCIAL_ENABLED_FIELDS = SOCIAL_PLATFORMS.map(
  (platform) => socialPlatformFieldNames(platform.code).enabled as keyof SiteSettingsForm,
);
const SOCIAL_URL_FIELDS = SOCIAL_PLATFORMS.map(
  (platform) => socialPlatformFieldNames(platform.code).url as keyof SiteSettingsForm,
);
const FOOTER_SECTION_FIELDS = FOOTER_SECTIONS.map(
  (section) => section.field as keyof SiteSettingsForm,
);

/** `siteName` → `siteNameI18n`, so a translation is never listed on a tab other than its base. */
function i18nFieldOf(field: keyof SiteSettingsForm): keyof SiteSettingsForm | undefined {
  return siteSettingsI18nFieldFor(field as SiteSettingsCopyField) as keyof SiteSettingsForm | undefined;
}

/**
 * The override maps that belong to `fields`.
 *
 * Derived rather than restated: adding a translated copy field then only means extending
 * `SITE_SETTINGS_I18N_FIELDS`, and the reachability gate below still accounts for the map.
 */
function i18nFieldsFor(fields: readonly (keyof SiteSettingsForm)[]): (keyof SiteSettingsForm)[] {
  return fields
    .map(i18nFieldOf)
    .filter((field): field is keyof SiteSettingsForm => field !== undefined);
}

const IDENTITY_BASE_FIELDS = ['siteName', 'shortName', 'description', 'seoTitle', 'seoDescription'] as const;

const LINK_BASE_FIELDS = [
  'docsUrl',
  'supportUrl',
  'privacyUrl',
  'termsUrl',
  'footerCopyright',
  'icpRecordNumber',
  'icpRecordUrl',
  'policeRecordNumber',
  'policeRecordUrl',
] as const;

export const CATEGORY_FIELDS: Record<SiteSettingsCategoryId, readonly (keyof SiteSettingsForm)[]> = {
  identity: [...IDENTITY_BASE_FIELDS, ...i18nFieldsFor(IDENTITY_BASE_FIELDS)],
  assets: ['logo', 'icon', 'favicon'],
  theme: ['brandColor', 'accentColor', 'customCss'],
  // Both documents are one form field each — the tab owns the whole payload, so a control that
  // edits part of it reports through the field it belongs to. Splitting them across tabs would
  // make "which tab do I save this on?" ambiguous for a single round-tripped document.
  homepage: ['homepage'],
  downloads: ['downloads'],
  social: [...SOCIAL_ENABLED_FIELDS, ...SOCIAL_URL_FIELDS],
  qrCodes: [
    'officialAccountQrCode',
    'officialAccountQrCodeEnabled',
    'videoChannelQrCode',
    'videoChannelQrCodeEnabled',
    'douyinQrCode',
    'douyinQrCodeEnabled',
    'communityGroupQrCode',
    'communityGroupQrCodeEnabled',
  ],
  footerLayout: FOOTER_SECTION_FIELDS,
  links: [...LINK_BASE_FIELDS, ...i18nFieldsFor(LINK_BASE_FIELDS)],
};

/**
 * Form fields that deliberately get no control on any tab — none today. The list exists so the
 * gate below can distinguish "intentionally hidden" from "forgotten".
 */
export const FIELDS_WITHOUT_A_CONTROL: readonly (keyof SiteSettingsForm)[] = [];

/**
 * Names every form field no tab renders.
 *
 * Without this, adding a contract field to the form would leave it unreachable: the operator
 * would see it in the API payload but have no control to change it, and nothing would fail.
 */
export function findUnreachableSiteSettingsFields(): string[] {
  const covered = new Set<string>([
    ...Object.values(CATEGORY_FIELDS).flat(),
    ...FIELDS_WITHOUT_A_CONTROL,
  ]);
  return Object.keys(DEFAULT_SITE_SETTINGS).filter((field) => !covered.has(field));
}

/** Names every field listed under two tabs, which would double-count it in the badges. */
export function findDuplicatedSiteSettingsFields(): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const fields of Object.values(CATEGORY_FIELDS)) {
    for (const field of fields) {
      if (seen.has(field)) {
        duplicated.add(field);
      }
      seen.add(field);
    }
  }
  return [...duplicated];
}
