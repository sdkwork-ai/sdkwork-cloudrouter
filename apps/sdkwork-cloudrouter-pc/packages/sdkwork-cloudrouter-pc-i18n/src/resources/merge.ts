import type { I18nMessageBundle, I18nResources, LocaleCode, LocaleMessages } from './types';

const REQUIRED_LOCALES = ['en', 'zh'] as const satisfies readonly LocaleCode[];
const OPTIONAL_LOCALES = ['de', 'fr', 'ja', 'ko', 'ru'] as const satisfies readonly LocaleCode[];
const ALL_LOCALES = [...REQUIRED_LOCALES, ...OPTIONAL_LOCALES] as const;

/**
 * Ensures the two required locales (`en`, `zh`) in a bundle carry the same set
 * of keys. Optional locales are not subject to this check — they may provide
 * partial translations, with missing keys falling back to English at runtime.
 */
function assertAlignedBundleKeys(bundle: I18nMessageBundle, bundleIndex: number): void {
  const firstLocale = REQUIRED_LOCALES[0];
  const otherLocales = REQUIRED_LOCALES.slice(1);
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
    if (value === undefined) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      throw new Error(`Duplicate i18n key ${key} in ${locale} bundle ${bundleIndex}`);
    }
    target[key] = value;
  }
}

/**
 * Returns a copy of `bundle` without the messages whose key starts with one of
 * `prefixes`.
 *
 * A capability may ship the same copy with several self-sufficient modules: the
 * order capability carries its whole `orders.*` subject/asset label set in every
 * admin module so a module can render through its own provider. When the host
 * composes those modules into one flat catalog only one owner may remain, so the
 * host drops the module copies before merging. The duplicate-key guard still
 * rejects every collision that was not declared here.
 */
export function withoutMessagePrefixes(
  bundle: I18nMessageBundle,
  prefixes: readonly string[],
): I18nMessageBundle {
  const isDropped = (key: string): boolean => prefixes.some((prefix) => key.startsWith(prefix));
  const filterMessages = (messages: Partial<LocaleMessages>): LocaleMessages => {
    const kept: LocaleMessages = {};
    for (const [key, value] of Object.entries(messages)) {
      if (value === undefined || isDropped(key)) {
        continue;
      }
      kept[key] = value;
    }
    return kept;
  };

  const filtered: I18nMessageBundle = {
    en: filterMessages(bundle.en),
    zh: filterMessages(bundle.zh),
  };
  for (const locale of OPTIONAL_LOCALES) {
    const messages = bundle[locale];
    if (messages) {
      filtered[locale] = filterMessages(messages);
    }
  }
  return filtered;
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
