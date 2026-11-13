import { createInstance, type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  resolveConsoleMessages,
  type SdkworkConsoleLocale,
} from '@sdkwork/cloudrouter-h5-i18n';

/**
 * Builds the isolated i18next instance consumed by the order-owned mobile UI.
 *
 * `@sdkwork/order-mobile-react-orders` reads the `orders.*` resource keys and
 * falls back to inline copy. The Cloud Router H5 console catalog is a flat
 * `Record<key, message>` map, so the instance disables both the key and
 * namespace separators; every `orders.*` key then resolves verbatim instead of
 * being split into a nested namespace path (`I18N_SPEC.md` section 6).
 */
export function createCloudRouterOrdersI18n(locale: SdkworkConsoleLocale): I18nInstance {
  const instance = createInstance();
  const zhMessages = resolveConsoleMessages('zh-CN');
  const enMessages = resolveConsoleMessages('en-US');
  void instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: 'zh-CN',
    resources: {
      'zh-CN': { translation: zhMessages },
      'en-US': { translation: enMessages },
    },
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    // Resources are local and already loaded: initializing synchronously keeps
    // the first cashier render from flashing untranslated inline defaults.
    initAsync: false,
  });
  return instance;
}
