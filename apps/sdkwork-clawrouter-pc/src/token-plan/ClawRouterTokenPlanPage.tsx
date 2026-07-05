import { useTranslation } from 'react-i18next';
import { SdkworkSubscriptionPage } from '@sdkwork/membership-pc-subscription';

import { resolveConsoleSubscriptionLocale } from '../console-business/consoleCommerceLocale.ts';

export function ClawRouterTokenPlanPage() {
  const { i18n } = useTranslation();
  const locale = resolveConsoleSubscriptionLocale(i18n.resolvedLanguage ?? i18n.language);

  return <SdkworkSubscriptionPage locale={locale} />;
}
