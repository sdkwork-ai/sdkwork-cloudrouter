/**
 * Localized display names for pricing catalog data. The catalog API only
 * carries stable codes (vendor/region/operation/meter), so display names are
 * resolved here with locale-aware dictionaries and a humanized-code fallback.
 * Authored display-name copy lives in the en-US/zh-CN i18n fragments; this
 * module only combines them and applies the fallback logic.
 */
import { vendorDisplayNames as vendorDisplayNamesEn } from '../i18n/en-US/commerce/dataNames/vendor';
import { vendorDisplayNames as vendorDisplayNamesZh } from '../i18n/zh-CN/commerce/dataNames/vendor';
import { regionDisplayNames as regionDisplayNamesEn } from '../i18n/en-US/commerce/dataNames/region';
import { regionDisplayNames as regionDisplayNamesZh } from '../i18n/zh-CN/commerce/dataNames/region';

type LocalizedName = { en: string; zh: string };

function combineLocales(
  en: Record<string, string>,
  zh: Record<string, string>,
): Record<string, LocalizedName> {
  const result: Record<string, LocalizedName> = {};
  for (const code of Object.keys(en)) {
    result[code] = { en: en[code], zh: zh[code] ?? en[code] };
  }
  return result;
}

const VENDOR_DISPLAY_NAMES: Record<string, LocalizedName> = combineLocales(
  vendorDisplayNamesEn,
  vendorDisplayNamesZh,
);
const REGION_DISPLAY_NAMES: Record<string, LocalizedName> = combineLocales(
  regionDisplayNamesEn,
  regionDisplayNamesZh,
);

/** Maps any app language tag to the dictionary locale used by this module. */
export function dataNameLocale(language: string): 'en' | 'zh' {
  return language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function localizedName(
  dictionaries: Record<string, LocalizedName>,
  code: string,
  locale: 'en' | 'zh',
  fallback: string,
): string {
  return dictionaries[code]?.[locale] ?? fallback;
}

export function vendorDisplayName(vendorCode: string, language: string): string {
  const code = vendorCode.trim();
  if (!code) return code;
  return localizedName(VENDOR_DISPLAY_NAMES, code, dataNameLocale(language), humanizeCode(code));
}

export function regionDisplayName(regionCode: string, language: string): string {
  const code = regionCode.trim();
  if (!code) return code;
  return localizedName(REGION_DISPLAY_NAMES, code, dataNameLocale(language), humanizeCode(code));
}

export function humanizeCode(value: string): string {
  return value.replace(/[._-]+/gu, ' ').replace(/\b\w/gu, (letter) => letter.toUpperCase());
}