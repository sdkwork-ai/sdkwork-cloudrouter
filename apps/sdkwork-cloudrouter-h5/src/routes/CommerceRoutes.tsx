import {
  TokenRechargePage,
  VipSubscriptionPage,
} from '@sdkwork/membership-mobile-react-subscription';

import { CloudRouterOrdersI18nProvider } from '@sdkwork/cloudrouter-h5-orders';

import { useConsoleRuntime } from '../providers/AppProviders.js';

/**
 * Host adapters for the membership-owned mobile commerce surfaces.
 *
 * Both pages render outside the console tab shell (they are stacked commerce
 * screens with their own back/title bar, so the tab bar must not show). The
 * shared membership package owns the plan/credit UI and its copy; this host
 * only injects the console locale so `react-i18next` resolves through the
 * console i18n runtime.
 */
function MembershipHost({ children }: { readonly children: React.ReactNode }) {
  const { locale } = useConsoleRuntime();
  return <CloudRouterOrdersI18nProvider locale={locale}>{children}</CloudRouterOrdersI18nProvider>;
}

export function MembershipRoute() {
  return (
    <MembershipHost>
      <VipSubscriptionPage />
    </MembershipHost>
  );
}

export function RechargeRoute() {
  return (
    <MembershipHost>
      <TokenRechargePage />
    </MembershipHost>
  );
}
