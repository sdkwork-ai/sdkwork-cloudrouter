import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';
import { syncDocumentLanguage } from './sync-document-language.ts';

export { consoleGatewayI18nKeyRegistry } from './console-gateway-i18n-key-registry.ts';

interface LegacyNavigatorLanguage {
  userLanguage?: string;
}

const SUPPORTED_LNGS = ['en', 'zh', 'de', 'fr', 'ja', 'ko', 'ru'] as const;

/**
 * Maps a raw browser/storage locale string to one of the supported language codes.
 * Falls back to `'en'` when no supported language can be resolved.
 */
function resolveSupportedLocale(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('ko')) return 'ko';
  if (lower.startsWith('ru')) return 'ru';
  return undefined;
}

const getBrowserLanguage = () => {
  // 1. Explicit user selection (ignore legacy i18nextLng cache from plugin)
  const userSelected = localStorage.getItem('user_explicit_lang');
  const explicit = resolveSupportedLocale(userSelected ?? undefined);
  if (explicit) return explicit;

  // 2. OS / browser language detection
  const navigatorLanguage = window.navigator as Navigator & LegacyNavigatorLanguage;
  const candidates = [
    navigatorLanguage.language,
    navigatorLanguage.userLanguage,
    ...(navigatorLanguage.languages ?? []),
  ];
  for (const candidate of candidates) {
    const resolved = resolveSupportedLocale(candidate);
    if (resolved) return resolved;
  }

  return 'en'; // default to english
};

i18n
  .use(initReactI18next)
  .init({
    lng: getBrowserLanguage(),
    resources,
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LNGS],
    interpolation: {
      escapeValue: false,
      defaultVariables: {
        platformName: 'Claw Router',
      },
    },
  });

syncDocumentLanguage(i18n.language);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
