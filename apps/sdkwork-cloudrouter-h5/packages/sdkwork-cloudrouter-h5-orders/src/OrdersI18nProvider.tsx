import { useMemo, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import type { SdkworkConsoleLocale } from '@sdkwork/cloudrouter-h5-i18n';

import { createCloudRouterOrdersI18n } from './i18n.js';

export interface CloudRouterOrdersI18nProviderProps {
  readonly locale: SdkworkConsoleLocale;
  readonly children: ReactNode;
}

/**
 * Provides the order UI with its own i18next instance.
 *
 * The cashier/order pages call `useTranslation()` directly, so they must sit
 * under an `I18nextProvider`; the instance is recreated only when the console
 * locale changes.
 */
export function CloudRouterOrdersI18nProvider({
  locale,
  children,
}: CloudRouterOrdersI18nProviderProps) {
  const instance = useMemo(() => createCloudRouterOrdersI18n(locale), [locale]);
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
