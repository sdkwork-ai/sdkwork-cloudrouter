import type { AdminSiteSettingsResponse } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import type { SiteSettingsLocale } from './siteSettingsLocales';

/**
 * The copy fields that carry a per-locale translation, paired with their override map.
 *
 * Each entry is copy an end user reads — the site name, the summary, the SEO pair and the footer
 * line — rather than a colour, a URL or a switch, which mean the same thing in every language.
 * Declaring the pair once is what lets the form, the update payload, the tab mapping and the
 * reachability gate agree on the same set: adding a translated field means adding one row here.
 *
 * Dependency-free on purpose. The parity gate has to read this list, and importing the form's
 * service module would drag the SDK client graph — and its runtime configuration — into a check
 * that only wants to compare two lists of names. Same reason `siteSettingsLocales.ts` is separate.
 * The type-only import above is erased at runtime, so the contract is still checked at compile
 * time — a rename in the generated types cannot leave a row pointing at a field that is gone —
 * without costing the gate anything. The other direction (a contract field added without a row
 * here) is what the parity gate in `apps/sdkwork-cloudrouter-pc/site-settings-parity.test.ts`
 * covers.
 */
export const SITE_SETTINGS_I18N_FIELDS = [
  { field: 'siteName', i18nField: 'siteNameI18n' },
  { field: 'shortName', i18nField: 'shortNameI18n' },
  { field: 'description', i18nField: 'descriptionI18n' },
  { field: 'seoTitle', i18nField: 'seoTitleI18n' },
  { field: 'seoDescription', i18nField: 'seoDescriptionI18n' },
  { field: 'footerCopyright', i18nField: 'footerCopyrightI18n' },
] as const satisfies ReadonlyArray<{
  field: keyof AdminSiteSettingsResponse;
  i18nField: keyof AdminSiteSettingsResponse;
}>;

export type SiteSettingsCopyField = (typeof SITE_SETTINGS_I18N_FIELDS)[number]['field'];
export type SiteSettingsI18nField = (typeof SITE_SETTINGS_I18N_FIELDS)[number]['i18nField'];

/**
 * One copy field's per-locale overrides.
 *
 * An absent or blank entry means "publish the base value", so a deployment that never opened
 * `/admin/site` — and a locale the operator has not translated yet — both render the single
 * authored string instead of an empty region.
 */
export type SiteSettingsI18nMap = Partial<Record<SiteSettingsLocale, string>>;

/** Resolves the override map that belongs to a copy field, so callers never restate the pairing. */
export function siteSettingsI18nFieldFor(
  field: SiteSettingsCopyField,
): SiteSettingsI18nField | undefined {
  return SITE_SETTINGS_I18N_FIELDS.find((entry) => entry.field === field)?.i18nField;
}
