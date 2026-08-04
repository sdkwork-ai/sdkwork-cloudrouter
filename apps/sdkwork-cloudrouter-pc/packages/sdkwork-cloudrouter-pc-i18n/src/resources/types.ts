export type LocaleCode = 'en' | 'zh' | 'de' | 'fr' | 'ja' | 'ko' | 'ru';

export type LocaleMessages = Record<string, string>;

/**
 * A message bundle maps locale codes to their message keys.
 *
 * Only `en` and `zh` are required for every bundle. The remaining locales
 * (`de`, `fr`, `ja`, `ko`, `ru`) are optional — when a translation is
 * missing, i18next falls back to `fallbackLng: "en"`.
 */
export type I18nMessageBundle = {
  en: LocaleMessages;
  zh: LocaleMessages;
  de?: Partial<LocaleMessages>;
  fr?: Partial<LocaleMessages>;
  ja?: Partial<LocaleMessages>;
  ko?: Partial<LocaleMessages>;
  ru?: Partial<LocaleMessages>;
};

export type I18nResources = Record<LocaleCode, { translation: LocaleMessages }>;
