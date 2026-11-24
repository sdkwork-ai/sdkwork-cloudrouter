import { createInstance, type i18n as I18nInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { useMemo, type ReactNode } from 'react';

import { resolveConsoleMessages, type SdkworkConsoleLocale } from '@sdkwork/cloudrouter-h5-i18n';

/**
 * Isolated i18next instance for the membership-owned mobile UI.
 *
 * The membership screens receive their copy through the package `translate`
 * prop, but the shared mobile page header calls `useTranslation()`; this
 * instance satisfies that hook with the Cloud Router console catalog. The
 * catalog is a flat `Record<key, message>` map, so both separators are disabled
 * and every key resolves verbatim (`I18N_SPEC.md` section 6).
 */
export function createCloudRouterMembershipI18n(locale: SdkworkConsoleLocale): I18nInstance {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    fallbackLng: 'zh-CN',
    initAsync: false,
    interpolation: { escapeValue: false },
    keySeparator: false,
    lng: locale,
    nsSeparator: false,
    resources: {
      'en-US': { translation: resolveConsoleMessages('en-US') },
      'zh-CN': { translation: resolveConsoleMessages('zh-CN') },
    },
  });
  return instance;
}

export interface CloudRouterMembershipI18nProviderProps {
  readonly children: ReactNode;
  readonly locale: SdkworkConsoleLocale;
}

/** Provides the membership pages with their own i18next instance. */
export function CloudRouterMembershipI18nProvider({
  children,
  locale,
}: CloudRouterMembershipI18nProviderProps) {
  const instance = useMemo(() => createCloudRouterMembershipI18n(locale), [locale]);
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
