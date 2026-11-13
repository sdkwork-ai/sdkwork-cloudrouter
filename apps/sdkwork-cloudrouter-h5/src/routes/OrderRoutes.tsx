import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';

import type { SdkworkConsoleLocale } from '@sdkwork/cloudrouter-h5-i18n';

import { AppAuthGate } from '../AuthGate.js';
import { useConsoleRuntime } from '../providers/AppProviders.js';

type OrderPageProps = { readonly locale: SdkworkConsoleLocale };

function lazyOrderPage(exportName: string): LazyExoticComponent<ComponentType<OrderPageProps>> {
  return lazy(async () => {
    const module = await import('@sdkwork/cloudrouter-h5-orders');
    const page = module[exportName as keyof typeof module];
    if (!page) {
      throw new Error(`CloudRouter order page ${exportName} is not exported.`);
    }
    return { default: page as ComponentType<OrderPageProps> };
  });
}

const CloudRouterCashierPage = lazyOrderPage('CloudRouterCashierPage');
const CloudRouterOrderCenterPage = lazyOrderPage('CloudRouterOrderCenterPage');
const CloudRouterOrderDetailPage = lazyOrderPage('CloudRouterOrderDetailPage');
const CloudRouterRefundRequestsPage = lazyOrderPage('CloudRouterRefundRequestsPage');

/**
 * Standalone order/cashier host: the cashier and order flow render outside the
 * console shell (no console header, no tab bar) because they are stacked
 * surfaces reached from a deep link or an order row, not console tabs.
 */
function OrderRouteShell({ page }: { page: ComponentType<OrderPageProps> }) {
  const { locale, translate } = useConsoleRuntime();
  const Page = page;
  return (
    <AppAuthGate>
      <Suspense
        fallback={(
          <div className="flex h-screen items-center justify-center bg-[var(--cr-canvas)] text-sm text-[var(--cr-ink-muted)]">
            {translate('cloudrouter.console.shared.loading')}
          </div>
        )}
      >
        <Page locale={locale} />
      </Suspense>
    </AppAuthGate>
  );
}

export function OrderCenterRoute() {
  return <OrderRouteShell page={CloudRouterOrderCenterPage} />;
}

export function OrderDetailRoute() {
  return <OrderRouteShell page={CloudRouterOrderDetailPage} />;
}

export function OrderCashierRoute() {
  return <OrderRouteShell page={CloudRouterCashierPage} />;
}

export function CashierEntryRoute() {
  return <OrderRouteShell page={CloudRouterCashierPage} />;
}

export function RefundRequestsRoute() {
  return <OrderRouteShell page={CloudRouterRefundRequestsPage} />;
}
