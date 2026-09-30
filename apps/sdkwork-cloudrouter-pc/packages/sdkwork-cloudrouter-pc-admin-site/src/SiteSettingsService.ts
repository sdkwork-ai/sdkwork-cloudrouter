import type {
  AdminSiteSettingsResponse,
  AdminSiteSettingsUpdateRequest,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { getCloudRouterBackendSdkClient } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import {
  FOOTER_SECTIONS,
  SOCIAL_PLATFORMS,
  createDefaultFooterSectionSwitches,
  createDefaultSocialPlatformLinks,
  socialPlatformFieldNames,
  type FooterSectionSwitches,
  type SocialPlatformCode,
  type SocialPlatformLinks,
} from '@sdkwork/cloudroutes-pc-commons/footer-settings';
import {
  ensureSdkworkApiSuccess,
  readApiRecord,
  readMediaResource,
  toSdkMediaResource,
  type CloudRouterMediaResource,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  SITE_SETTINGS_LOCALES,
  isSiteSettingsLocale,
  type SiteSettingsLocale,
} from './siteSettingsLocales';
import {
  SITE_SETTINGS_I18N_FIELDS,
  siteSettingsI18nFieldFor,
  type SiteSettingsCopyField,
  type SiteSettingsI18nField,
  type SiteSettingsI18nMap,
} from './siteSettingsI18nFields';
import {
  createDefaultHomeContentForm,
  readDownloadCatalogText,
  readHomeContentForm,
  toDownloadCatalogPayload,
  toHomeContentPayload,
  type HomeContentForm,
} from './siteContentFields';

export { SITE_SETTINGS_LOCALES, isSiteSettingsLocale };
export { SITE_SETTINGS_I18N_FIELDS, siteSettingsI18nFieldFor };
export type {
  SiteSettingsCopyField,
  SiteSettingsI18nField,
  SiteSettingsI18nMap,
  SiteSettingsLocale,
};
export type { HomeContentForm } from './siteContentFields';

/**
 * The contract spells the follow-us fields as `footerSocial<Platform><Suffix>`. Deriving them
 * from the platform registry means a new platform is a registry entry, not a 24-line diff here —
 * and a typo in the casing is a compile error rather than a field that silently never round-trips.
 */
type SocialFormFields = {
  [K in SocialPlatformCode as `footerSocial${Capitalize<K>}Enabled`]: boolean;
} & {
  [K in SocialPlatformCode as `footerSocial${Capitalize<K>}Url`]: string;
};

type MediaBackedKeys =
  | 'logo'
  | 'icon'
  | 'favicon'
  | 'officialAccountQrCode'
  | 'communityGroupQrCode'
  | 'videoChannelQrCode'
  | 'douyinQrCode';

type QrVisibilityKeys =
  | 'officialAccountQrCodeEnabled'
  | 'communityGroupQrCodeEnabled'
  | 'videoChannelQrCodeEnabled'
  | 'douyinQrCodeEnabled';

/**
 * The two contract fields that carry a document rather than a scalar.
 *
 * Both are re-declared on the form with types the generated contract cannot express: the contract
 * spells them `Record<string, JsonValue>`, which would let any control write any shape into the
 * payload. `homepage` becomes the console's flat editor state and `downloads` the canonical JSON
 * text of the catalog, so the compiler — not a reviewer — keeps a control from writing the wrong
 * thing into either document.
 */
type DocumentBackedKeys = 'homepage' | 'downloads';

/**
 * The form owns the maps itself rather than inheriting them as opaque objects: each one is keyed by
 * a supported locale, so the type is what stops the editor from writing a tag the backend rejects.
 * Derived from the pairing table, so there is one list of translated fields, not two.
 */
type I18nBackedKeys = SiteSettingsI18nField;

export type SiteSettingsForm = Omit<
  AdminSiteSettingsResponse,
  MediaBackedKeys | QrVisibilityKeys | I18nBackedKeys | DocumentBackedKeys
> & {
  logo?: CloudRouterMediaResource;
  icon?: CloudRouterMediaResource;
  favicon?: CloudRouterMediaResource;
  officialAccountQrCode?: CloudRouterMediaResource;
  communityGroupQrCode?: CloudRouterMediaResource;
  videoChannelQrCode?: CloudRouterMediaResource;
  douyinQrCode?: CloudRouterMediaResource;
  // The generated contract marks these optional; the form always resolves them to a boolean
  // so the page never has to branch on `undefined`.
  officialAccountQrCodeEnabled: boolean;
  communityGroupQrCodeEnabled: boolean;
  videoChannelQrCodeEnabled: boolean;
  douyinQrCodeEnabled: boolean;
  /** The homepage document, flattened into the controls that edit it. */
  homepage: HomeContentForm;
  /** The download catalog as canonical JSON text; blank means "publish the bundled catalog". */
  downloads: string;
} & Record<I18nBackedKeys, SiteSettingsI18nMap> & FooterSectionSwitches & SocialFormFields;

const BASE_DEFAULTS = {
  siteName: 'Cloud Router',
  shortName: 'Cloud Router',
  description: 'Unified AI gateway and model routing platform.',
  logo: undefined,
  icon: undefined,
  favicon: undefined,
  officialAccountQrCode: undefined,
  communityGroupQrCode: undefined,
  videoChannelQrCode: undefined,
  douyinQrCode: undefined,
  // Every follow channel is advertised by default; operators switch off the ones they do
  // not run. The backend seeds the same defaults, so an untouched deployment matches.
  officialAccountQrCodeEnabled: true,
  communityGroupQrCodeEnabled: true,
  videoChannelQrCodeEnabled: true,
  douyinQrCodeEnabled: true,
  brandColor: '#0f172a',
  accentColor: '#e9583f',
  footerCopyright: 'Cloud Router. All rights reserved.',
  icpRecordNumber: '',
  icpRecordUrl: '',
  policeRecordNumber: '',
  policeRecordUrl: '',
  seoTitle: 'Cloud Router',
  seoDescription: 'Unified AI gateway and model routing platform.',
  supportUrl: '',
  docsUrl: '/docs',
  privacyUrl: '/privacy',
  termsUrl: '/terms',
  customCss: '',
  // Both documents start empty, which is the state the landing page already renders: no homepage
  // overrides means the bundled copy publishes, and no catalog means the one checked into the
  // repository publishes. An operator who never touches these tabs changes nothing.
  downloads: '',
  homepage: createDefaultHomeContentForm(),
  // No locale starts out translated: an empty map means every language publishes the base copy,
  // which is exactly what a deployment that never opened this page renders.
  siteNameI18n: {},
  shortNameI18n: {},
  descriptionI18n: {},
  seoTitleI18n: {},
  seoDescriptionI18n: {},
  footerCopyrightI18n: {},
};

export const DEFAULT_SITE_SETTINGS: SiteSettingsForm = {
  ...BASE_DEFAULTS,
  ...createDefaultFooterSectionSwitches(),
  ...toSocialFormFields(createDefaultSocialPlatformLinks()),
};

export const SiteSettingsService = {
  async fetchSettings(): Promise<SiteSettingsForm> {
    const result = await getCloudRouterBackendSdkClient().system.site.settings.retrieve();
    ensureSdkworkApiSuccess(result, 'Unable to load site settings');
    return toSiteSettings(readApiRecord(result));
  },

  async updateSettings(input: SiteSettingsForm): Promise<SiteSettingsForm> {
    const result = await getCloudRouterBackendSdkClient().system.site.settings.update(toSiteSettingsUpdateRequest(input));
    ensureSdkworkApiSuccess(result, 'Unable to update site settings');
    return toSiteSettings(readApiRecord(result));
  },
};

export function toSiteSettings(record: Record<string, unknown>): SiteSettingsForm {
  return {
    siteName: readString(record, 'siteName', DEFAULT_SITE_SETTINGS.siteName),
    shortName: readString(record, 'shortName', DEFAULT_SITE_SETTINGS.shortName),
    description: readString(record, 'description', DEFAULT_SITE_SETTINGS.description),
    logo: readMediaResource(record.logo),
    icon: readMediaResource(record.icon),
    favicon: readMediaResource(record.favicon),
    officialAccountQrCode: readMediaResource(record.officialAccountQrCode),
    communityGroupQrCode: readMediaResource(record.communityGroupQrCode),
    videoChannelQrCode: readMediaResource(record.videoChannelQrCode),
    douyinQrCode: readMediaResource(record.douyinQrCode),
    officialAccountQrCodeEnabled: readBoolean(record, 'officialAccountQrCodeEnabled', true),
    communityGroupQrCodeEnabled: readBoolean(record, 'communityGroupQrCodeEnabled', true),
    videoChannelQrCodeEnabled: readBoolean(record, 'videoChannelQrCodeEnabled', true),
    douyinQrCodeEnabled: readBoolean(record, 'douyinQrCodeEnabled', true),
    brandColor: readString(record, 'brandColor', DEFAULT_SITE_SETTINGS.brandColor),
    accentColor: readString(record, 'accentColor', DEFAULT_SITE_SETTINGS.accentColor),
    footerCopyright: readString(record, 'footerCopyright', DEFAULT_SITE_SETTINGS.footerCopyright),
    icpRecordNumber: readString(record, 'icpRecordNumber', DEFAULT_SITE_SETTINGS.icpRecordNumber),
    icpRecordUrl: readString(record, 'icpRecordUrl', DEFAULT_SITE_SETTINGS.icpRecordUrl),
    policeRecordNumber: readString(record, 'policeRecordNumber', DEFAULT_SITE_SETTINGS.policeRecordNumber),
    policeRecordUrl: readString(record, 'policeRecordUrl', DEFAULT_SITE_SETTINGS.policeRecordUrl),
    seoTitle: readString(record, 'seoTitle', DEFAULT_SITE_SETTINGS.seoTitle),
    seoDescription: readString(record, 'seoDescription', DEFAULT_SITE_SETTINGS.seoDescription),
    supportUrl: readString(record, 'supportUrl', DEFAULT_SITE_SETTINGS.supportUrl),
    docsUrl: readString(record, 'docsUrl', DEFAULT_SITE_SETTINGS.docsUrl),
    privacyUrl: readString(record, 'privacyUrl', DEFAULT_SITE_SETTINGS.privacyUrl),
    termsUrl: readString(record, 'termsUrl', DEFAULT_SITE_SETTINGS.termsUrl),
    customCss: readString(record, 'customCss', DEFAULT_SITE_SETTINGS.customCss),
    homepage: readHomeContentForm(record.homepage),
    downloads: readDownloadCatalogText(record.downloads),
    ...readFooterFields(record),
    ...readI18nFields(record),
  };
}

/**
 * Reads the six per-locale override maps off a response payload.
 *
 * Unsupported locale keys and blank values are dropped rather than surfaced, mirroring the
 * backend's own normalization: a blank override publishes the base copy, so keeping it in the
 * form would make the editor claim a translation that never renders.
 */
function readI18nFields(
  record: Record<string, unknown>,
): Record<SiteSettingsI18nField, SiteSettingsI18nMap> {
  const fields = {} as Record<SiteSettingsI18nField, SiteSettingsI18nMap>;
  for (const { i18nField } of SITE_SETTINGS_I18N_FIELDS) {
    fields[i18nField] = readI18nMap(record[i18nField]);
  }
  return fields;
}

function readI18nMap(value: unknown): SiteSettingsI18nMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const map: SiteSettingsI18nMap = {};
  for (const [tag, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!isSiteSettingsLocale(tag) || typeof entry !== 'string') {
      continue;
    }
    const trimmed = entry.trim();
    if (trimmed.length > 0) {
      map[tag] = trimmed;
    }
  }
  return map;
}

/**
 * Reads the footer region switches and the follow-us field pairs off a response payload.
 *
 * An absent switch means the payload predates the field. Regions all rendered before they became
 * switchable, and the four `defaultEnabled` platforms rendered before they became configurable,
 * so the registry's own defaults are the correct fallback — an operator who never touched the
 * page keeps exactly the footer they had.
 */
function readFooterFields(
  record: Record<string, unknown>,
): FooterSectionSwitches & SocialFormFields {
  const fields: Record<string, string | boolean> = {};
  for (const section of FOOTER_SECTIONS) {
    fields[section.field] = readBoolean(record, section.field, true);
  }
  for (const platform of SOCIAL_PLATFORMS) {
    const names = socialPlatformFieldNames(platform.code);
    fields[names.enabled] = readBoolean(record, names.enabled, platform.defaultEnabled);
    fields[names.url] = readLinkString(record, names.url, platform.defaultUrl);
  }
  return fields as unknown as FooterSectionSwitches & SocialFormFields;
}

/**
 * Reads an operator-editable link, where an **empty string is a stored value** rather than a
 * missing field.
 *
 * `readString` below folds blank into "unset", which is right for optional copy — but applied to
 * a link it makes the form lie: the operator clears a platform's URL, saves, reloads, and the
 * shipped default is back in the input, so the next save silently restores a link they removed.
 * The backend already distinguishes the two (`normalize_social_link_field` stores an empty value),
 * so only a genuinely absent key falls back here.
 */
function readLinkString(record: Record<string, unknown>, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : fallback;
}

function readString(record: Record<string, unknown>, key: string, fallback = ''): string {
  const value = record[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function readBoolean(record: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = record[key];
  return typeof value === 'boolean' ? value : fallback;
}

/** Flattens the registry's link map into the contract's per-platform field pair. */
function toSocialFormFields(links: SocialPlatformLinks): SocialFormFields {
  const fields: Record<string, string | boolean> = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const names = socialPlatformFieldNames(platform.code);
    const link = links[platform.code];
    fields[names.enabled] = link.enabled;
    fields[names.url] = link.url;
  }
  return fields as SocialFormFields;
}

/**
 * Every footer field is sent on save, including the ones the operator did not touch. The update
 * endpoint applies whichever keys are present, so sending the full set is what keeps a disabled
 * platform from being resurrected by a partial payload.
 */
function pickFooterFields(form: SiteSettingsForm): FooterSectionSwitches & SocialFormFields {
  const fields: Record<string, string | boolean> = {};
  for (const section of FOOTER_SECTIONS) {
    fields[section.field] = form[section.field];
  }
  for (const platform of SOCIAL_PLATFORMS) {
    const names = socialPlatformFieldNames(platform.code);
    const enabledKey = names.enabled as keyof SiteSettingsForm;
    const urlKey = names.url as keyof SiteSettingsForm;
    fields[names.enabled] = form[enabledKey] === true;
    const urlValue = form[urlKey];
    fields[names.url] = typeof urlValue === 'string' ? urlValue : '';
  }
  return fields as unknown as FooterSectionSwitches & SocialFormFields;
}

/**
 * Builds the PATCH payload. Exported so the payload's shape — in particular "every footer field
 * is always present" — can be asserted without standing up an SDK client.
 */
export function toSiteSettingsUpdateRequest(form: SiteSettingsForm): AdminSiteSettingsUpdateRequest {
  // Both documents are normalised here rather than by each control: an untouched homepage goes out
  // as `{}` — "publish the bundled copy" — and an empty downloads box as `{}` — "publish the
  // catalog checked into the repository" — so saving the form cannot pin content the operator
  // never authored.
  const homepage = toHomeContentPayload(form.homepage) as unknown as AdminSiteSettingsUpdateRequest['homepage'];
  const downloads = toDownloadCatalogPayload(form.downloads) as unknown as AdminSiteSettingsUpdateRequest['downloads'];
  return {
    siteName: form.siteName,
    shortName: form.shortName,
    description: form.description,
    logo: toSdkMediaResource(form.logo, 'siteSettings.logo'),
    icon: toSdkMediaResource(form.icon, 'siteSettings.icon'),
    favicon: toSdkMediaResource(form.favicon, 'siteSettings.favicon'),
    officialAccountQrCode: toSdkMediaResource(form.officialAccountQrCode, 'siteSettings.officialAccountQrCode'),
    communityGroupQrCode: toSdkMediaResource(form.communityGroupQrCode, 'siteSettings.communityGroupQrCode'),
    videoChannelQrCode: toSdkMediaResource(form.videoChannelQrCode, 'siteSettings.videoChannelQrCode'),
    douyinQrCode: toSdkMediaResource(form.douyinQrCode, 'siteSettings.douyinQrCode'),
    officialAccountQrCodeEnabled: form.officialAccountQrCodeEnabled,
    communityGroupQrCodeEnabled: form.communityGroupQrCodeEnabled,
    videoChannelQrCodeEnabled: form.videoChannelQrCodeEnabled,
    douyinQrCodeEnabled: form.douyinQrCodeEnabled,
    brandColor: form.brandColor,
    accentColor: form.accentColor,
    footerCopyright: form.footerCopyright,
    icpRecordNumber: form.icpRecordNumber,
    icpRecordUrl: form.icpRecordUrl,
    policeRecordNumber: form.policeRecordNumber,
    policeRecordUrl: form.policeRecordUrl,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    supportUrl: form.supportUrl,
    docsUrl: form.docsUrl,
    privacyUrl: form.privacyUrl,
    termsUrl: form.termsUrl,
    customCss: form.customCss,
    homepage,
    downloads,
    ...pickFooterFields(form),
    ...pickI18nFields(form),
  };
}

/**
 * Builds the translation half of the payload.
 *
 * Like the footer fields, every map is sent on every save: the endpoint replaces whichever maps
 * are present, so sending the full set is what lets an operator clear one language's override
 * without that locale being resurrected from the stored payload.
 *
 * Blank entries are dropped rather than sent as empty strings — "no override" and "override to
 * nothing" are the same state on the backend, and only the former keeps the base copy published.
 */
function pickI18nFields(
  form: SiteSettingsForm,
): Record<SiteSettingsI18nField, Record<string, string>> {
  const fields = {} as Record<SiteSettingsI18nField, Record<string, string>>;
  for (const { i18nField } of SITE_SETTINGS_I18N_FIELDS) {
    const payload: Record<string, string> = {};
    for (const locale of SITE_SETTINGS_LOCALES) {
      const value = form[i18nField][locale]?.trim();
      if (value) {
        payload[locale] = value;
      }
    }
    fields[i18nField] = payload;
  }
  return fields;
}
