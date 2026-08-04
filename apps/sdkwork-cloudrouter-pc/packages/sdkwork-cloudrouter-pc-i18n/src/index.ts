import {
  createSdkworkMessageCatalog,
  defineSdkworkI18nRuntimeConfig,
  normalizeSdkworkLocale,
} from '@sdkwork/i18n-pc-react';
import { resources } from './resources';

export { consoleGatewayI18nKeyRegistry } from './console-gateway-i18n-key-registry.ts';

interface LegacyNavigatorLanguage {
  userLanguage?: string;
}

export const cloudRouterI18nRuntimeConfig = defineSdkworkI18nRuntimeConfig({
  activeLocales: ['en-US', 'zh-CN', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU'],
  defaultLocale: 'en-US',
  fallbackLocale: 'en-US',
  loadingStrategy: 'eager-core-lazy-feature',
  supportedLocales: ['en-US', 'zh-CN', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU'],
});

export const cloudRouterI18nCatalog = createSdkworkMessageCatalog({
  defaultLocale: 'en-US',
  locales: {
    'de-DE': resources.de.translation,
    'en-US': resources.en.translation,
    'fr-FR': resources.fr.translation,
    'ja-JP': resources.ja.translation,
    'ko-KR': resources.ko.translation,
    'ru-RU': resources.ru.translation,
    'zh-CN': resources.zh.translation,
  },
  namespace: 'translation',
});

export function resolveCloudRouterInitialLocale(): string {
  if (typeof window === 'undefined') {
    return cloudRouterI18nRuntimeConfig.defaultLocale;
  }

  const explicitLocale = window.localStorage.getItem('user_explicit_lang');
  if (explicitLocale) {
    return normalizeSdkworkLocale(explicitLocale, cloudRouterI18nRuntimeConfig);
  }

  const navigatorLanguage = window.navigator as Navigator & LegacyNavigatorLanguage;
  const candidates = [
    navigatorLanguage.language,
    navigatorLanguage.userLanguage,
    ...(navigatorLanguage.languages ?? []),
  ];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const resolvedLocale = normalizeSdkworkLocale(candidate, cloudRouterI18nRuntimeConfig);
    if (
      resolvedLocale !== cloudRouterI18nRuntimeConfig.defaultLocale
      || candidate.toLowerCase().startsWith('en')
    ) {
      return resolvedLocale;
    }
  }

  return cloudRouterI18nRuntimeConfig.defaultLocale;
}

export { resources } from './resources';
