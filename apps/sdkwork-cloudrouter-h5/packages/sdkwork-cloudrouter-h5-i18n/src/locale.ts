export const SDKWORK_CONSOLE_SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;

export type SdkworkConsoleLocale = (typeof SDKWORK_CONSOLE_SUPPORTED_LOCALES)[number];

export const SDKWORK_CONSOLE_DEFAULT_LOCALE: SdkworkConsoleLocale = 'zh-CN';

export function normalizeConsoleLocale(candidate: string | null | undefined): SdkworkConsoleLocale {
  if (!candidate) return SDKWORK_CONSOLE_DEFAULT_LOCALE;
  const normalized = candidate.trim().toLowerCase();
  const exact = SDKWORK_CONSOLE_SUPPORTED_LOCALES.find(
    (locale) => locale.toLowerCase() === normalized,
  );
  if (exact) return exact;
  const language = normalized.split('-')[0];
  const byLanguage = SDKWORK_CONSOLE_SUPPORTED_LOCALES.find(
    (locale) => locale.split('-')[0].toLowerCase() === language,
  );
  return byLanguage ?? SDKWORK_CONSOLE_DEFAULT_LOCALE;
}

export function resolveConsoleLocale(): SdkworkConsoleLocale {
  if (typeof navigator === 'undefined') return SDKWORK_CONSOLE_DEFAULT_LOCALE;
  return normalizeConsoleLocale(navigator.language);
}
