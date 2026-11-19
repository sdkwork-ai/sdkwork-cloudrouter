import { useMemo, type ReactNode } from 'react';
import { createInstance } from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import { COMMUNITY_I18N_RESOURCES } from '@sdkwork/community-mobile-react-community/i18n';
import type { SdkworkConsoleLocale } from '@sdkwork/cloudrouter-h5-i18n';

/**
 * Community UI translation instance.
 *
 * The community mobile pages read `community.*` keys from the default
 * namespace, but the Cloud Router H5 shell does not own a global i18next
 * instance (its console copy is a plain dictionary). The community route group
 * therefore gets a small isolated instance seeded from the community-owned
 * resource bundle, the same pattern the order package uses.
 */
export function CommunityI18nProvider({
  locale,
  children,
}: {
  readonly locale: SdkworkConsoleLocale;
  readonly children: ReactNode;
}) {
  const instance = useMemo(() => {
    const next = createInstance();
    void next.use(initReactI18next).init({
      lng: locale === 'zh-CN' ? 'zh' : 'en',
      fallbackLng: 'en',
      resources: COMMUNITY_I18N_RESOURCES,
      interpolation: { escapeValue: false },
    });
    return next;
  }, [locale]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
