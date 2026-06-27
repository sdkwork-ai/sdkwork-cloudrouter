import type { I18nMessageBundle, I18nResources, LocaleCode, LocaleMessages } from './types';

const LOCALES: LocaleCode[] = ['en', 'zh'];

function assertAlignedBundleKeys(bundle: I18nMessageBundle, bundleIndex: number): void {
  const [firstLocale, ...otherLocales] = LOCALES;
  const expectedKeys = Object.keys(bundle[firstLocale]).sort();

  for (const locale of otherLocales) {
    const localeKeys = Object.keys(bundle[locale]).sort();
    if (expectedKeys.length !== localeKeys.length || expectedKeys.some((key, index) => key !== localeKeys[index])) {
      throw new Error(`i18n bundle ${bundleIndex} has mismatched ${firstLocale}/${locale} keys`);
    }
  }
}

function assignBundleMessages(locale: LocaleCode, target: LocaleMessages, bundle: I18nMessageBundle, bundleIndex: number): void {
  for (const [key, value] of Object.entries(bundle[locale])) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      throw new Error(`Duplicate i18n key ${key} in ${locale} bundle ${bundleIndex}`);
    }
    target[key] = value;
  }
}

export function mergeI18nBundles(bundles: I18nMessageBundle[]): I18nResources {
  const translations: Record<LocaleCode, LocaleMessages> = { en: {}, zh: {} };

  bundles.forEach((bundle, index) => {
    assertAlignedBundleKeys(bundle, index);
    for (const locale of LOCALES) {
      assignBundleMessages(locale, translations[locale], bundle, index);
    }
  });

  return {
    en: { translation: translations.en },
    zh: { translation: translations.zh },
  };
}
