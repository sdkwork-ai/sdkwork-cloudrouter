import type { I18nMessageBundle, I18nResources, LocaleCode, LocaleMessages } from './types';

const REQUIRED_LOCALES: LocaleCode[] = ['en', 'zh'];
const OPTIONAL_LOCALES: LocaleCode[] = ['de', 'fr', 'ja', 'ko', 'ru'];
const ALL_LOCALES: LocaleCode[] = [...REQUIRED_LOCALES, ...OPTIONAL_LOCALES];

/**
 * Ensures the two required locales (`en`, `zh`) in a bundle carry the same set
 * of keys. Optional locales are not subject to this check — they may provide
 * partial translations, with missing keys falling back to English at runtime.
 */
function assertAlignedBundleKeys(bundle: I18nMessageBundle, bundleIndex: number): void {
  const [firstLocale, ...otherLocales] = REQUIRED_LOCALES;
  const expectedKeys = Object.keys(bundle[firstLocale]).sort();

  for (const locale of otherLocales) {
    const localeKeys = Object.keys(bundle[locale]).sort();
    if (expectedKeys.length !== localeKeys.length || expectedKeys.some((key, index) => key !== localeKeys[index])) {
      throw new Error(`i18n bundle ${bundleIndex} has mismatched ${firstLocale}/${locale} keys`);
    }
  }
}

function assignBundleMessages(locale: LocaleCode, target: LocaleMessages, bundle: I18nMessageBundle, bundleIndex: number): void {
  const messages = bundle[locale];
  if (!messages) {
    return;
  }
  for (const [key, value] of Object.entries(messages)) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      throw new Error(`Duplicate i18n key ${key} in ${locale} bundle ${bundleIndex}`);
    }
    target[key] = value;
  }
}

export function mergeI18nBundles(bundles: I18nMessageBundle[]): I18nResources {
  const translations = ALL_LOCALES.reduce(
    (acc, locale) => {
      acc[locale] = {};
      return acc;
    },
    {} as Record<LocaleCode, LocaleMessages>,
  );

  bundles.forEach((bundle, index) => {
    assertAlignedBundleKeys(bundle, index);
    for (const locale of ALL_LOCALES) {
      assignBundleMessages(locale, translations[locale], bundle, index);
    }
  });

  const resources = {} as I18nResources;
  for (const locale of ALL_LOCALES) {
    resources[locale] = { translation: translations[locale] };
  }
  return resources;
}
