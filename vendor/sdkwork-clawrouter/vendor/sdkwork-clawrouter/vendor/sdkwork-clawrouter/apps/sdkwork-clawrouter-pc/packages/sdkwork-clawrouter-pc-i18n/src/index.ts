import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';
import { syncDocumentLanguage } from './sync-document-language.ts';

export { consoleGatewayI18nKeyRegistry } from './console-gateway-i18n-key-registry.ts';

interface LegacyNavigatorLanguage {
  userLanguage?: string;
}

const getBrowserLanguage = () => {
  // 1. Explicit user selection (ignore legacy i18nextLng cache from plugin)
  const userSelected = localStorage.getItem('user_explicit_lang');
  if (userSelected) {
    if (userSelected.toLowerCase().includes('zh')) return 'zh';
    if (userSelected.toLowerCase().includes('en')) return 'en';
    return userSelected;
  }

  // 2. OS / browser language detection
  const navigatorLanguage = window.navigator as Navigator & LegacyNavigatorLanguage;
  const browserLang = navigatorLanguage.language || navigatorLanguage.userLanguage || navigatorLanguage.languages?.[0];
  if (browserLang) {
    if (browserLang.toLowerCase().includes('zh')) return 'zh';
  }
  return 'en'; // default to english
};

i18n
  .use(initReactI18next)
  .init({
    lng: getBrowserLanguage(),
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "zh"],
    interpolation: {
      escapeValue: false,
      defaultVariables: {
        platformName: "Claw Router",
      },
    },
  });

syncDocumentLanguage(i18n.language);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
