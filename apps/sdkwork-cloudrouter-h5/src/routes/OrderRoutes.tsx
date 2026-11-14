import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { useParams } from 'react-router-dom';

import type { SdkworkConsoleLocale } from '@sdkwork/cloudrouter-h5-i18n';
import { isCashierCapabilityToken } from '@sdkwork/cloudrouter-h5-orders';

import { AppAuthGate } from '../AuthGate.js';
import { useConsoleRuntime } from '../providers/AppProviders.js';

type OrderPageProps = { readonly locale: SdkworkConsoleLocale };
type AnonymousCashierPageProps = { readonly locale: SdkworkConsoleLocale; readonly token: string };

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

function lazyAnonymousCashierPage(
  exportName: string,
): LazyExoticComponent<ComponentType<AnonymousCashierPageProps>> {
  return lazy(async () => {
    const module = await import('@sdkwork/cloudrouter-h5-orders');
    const page = module[exportName as keyof typeof module];
    if (!page) {
      throw new Error(`CloudRouter order page ${exportName} is not exported.`);
    }
    return { default: page as ComponentType<AnonymousCashierPageProps> };
  });
}

const CloudRouterCashierPage = lazyOrderPage('CloudRouterCashierPage');
const CloudRouterAnonymousCashierPage = lazyAnonymousCashierPage('CloudRouterAnonymousCashierPage');
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

/**
 * Unified cashier entry emitted by the order/payment backend.
 *
 * The path segment decides which cashier the payer gets:
 *
 * - a capability token (`v1.<payload>.<signature>`) opens the **anonymous**
 *   cashier outside the auth gate — that is the scanned-QR case;
 * - anything else is a legacy `{orderId}` link and keeps the session gate, so an
 *   enumerable order key can never reach the order endpoints anonymously.
 */
export function CashierEntryRoute() {
  const { orderId } = useParams<{ orderId: string }>();
  const { locale, translate } = useConsoleRuntime();
  if (isCashierCapabilityToken(orderId)) {
    return (
      <Suspense
        fallback={(
          <div className="flex h-screen items-center justify-center bg-[var(--cr-canvas)] text-sm text-[var(--cr-ink-muted)]">
            {translate('cloudrouter.console.shared.loading')}
          </div>
        )}
      >
        <CloudRouterAnonymousCashierPage locale={locale} token={orderId!} />
      </Suspense>
    );
  }
  return <OrderRouteShell page={CloudRouterCashierPage} />;
}

export function RefundRequestsRoute() {
  return <OrderRouteShell page={CloudRouterRefundRequestsPage} />;
}
