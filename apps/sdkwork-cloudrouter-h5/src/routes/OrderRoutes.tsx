import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import type { SdkworkConsoleLocale } from '@sdkwork/cloudrouter-h5-i18n';
import { resolveCloudRouterAppApiBaseUrl } from '@sdkwork/cloudrouter-h5-core/sdk';

import { AppAuthGate } from '../AuthGate.js';
import { planCashierEntry } from '../commerce/cashierEntry.js';
import { useConsoleRuntime } from '../providers/AppProviders.js';

type OrderPageProps = { readonly locale: SdkworkConsoleLocale };
type AnonymousCashierPageProps = {
  readonly locale: SdkworkConsoleLocale;
  readonly token: string;
  readonly wechatAuthorizeUrl?: string;
};

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

type CashierEntryResolution =
  | { readonly kind: 'resolved'; readonly token: string }
  | { readonly kind: 'pending' }
  | { readonly kind: 'login' };

/**
 * Resolves the capability for the cashier entry path segment.
 *
 * A signed token is used as-is. A legacy pair (`orderId` + `outTradeNo`) is
 * exchanged for a token, so an already-printed QR no longer dead-ends on the
 * login screen. A bare order id cannot be proven payable and stays session-gated.
 */
function useCashierEntryResolution(orderId: string | undefined): CashierEntryResolution {
  const [searchParams] = useSearchParams();
  const outTradeNo = searchParams.get('outTradeNo');
  const plan = useMemo(
    () => planCashierEntry(orderId, outTradeNo),
    [orderId, outTradeNo],
  );
  const [resolution, setResolution] = useState<CashierEntryResolution>(() => (
    plan.kind === 'token'
      ? { kind: 'resolved', token: plan.token }
      : plan.kind === 'exchange'
        ? { kind: 'pending' }
        : { kind: 'login' }
  ));

  useEffect(() => {
    if (plan.kind === 'token') {
      setResolution({ kind: 'resolved', token: plan.token });
      return undefined;
    }
    if (plan.kind === 'login') {
      setResolution({ kind: 'login' });
      return undefined;
    }
    let cancelled = false;
    setResolution({ kind: 'pending' });
    // The order package is already a lazy route dependency; importing it here
    // keeps the exchange (and the order UI) out of the main console chunk.
    void import('@sdkwork/cloudrouter-h5-orders')
      .then(({ resolveLegacyCashierToken }) =>
        resolveLegacyCashierToken(plan.orderId, plan.outTradeNo))
      .then(
        (token) => {
          if (!cancelled) setResolution({ kind: 'resolved', token });
        },
        () => {
          // The exchange is the only proof a legacy pair is payable. When it fails
          // (no deployment secret, wrong trade number, unknown order) fall back to
          // the session-gated order flow instead of rendering a broken cashier.
          if (!cancelled) setResolution({ kind: 'login' });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [plan]);

  return resolution;
}

/**
 * Unified cashier entry emitted by the order/payment backend.
 *
 * The path segment decides which cashier the payer gets:
 *
 * - a capability token (`v1.<payload>.<signature>`) opens the **anonymous**
 *   cashier outside the auth gate — that is the current scanned-QR case;
 * - a legacy `{orderId}?outTradeNo=..` link exchanges the pair for a token and
 *   also opens the anonymous cashier, so QRs printed before tokens existed are
 *   not a login wall;
 * - a bare `{orderId}` link has no payable proof and keeps the session gate.
 */
export function CashierEntryRoute() {
  const { orderId } = useParams<{ orderId: string }>();
  const { locale, translate } = useConsoleRuntime();
  const resolution = useCashierEntryResolution(orderId);

  if (resolution.kind === 'login') {
    return <OrderRouteShell page={CloudRouterCashierPage} />;
  }
  if (resolution.kind === 'pending') {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--cr-canvas)] text-sm text-[var(--cr-ink-muted)]">
        {translate('cloudrouter.console.shared.loading')}
      </div>
    );
  }

  const token = resolution.token;
  // In-WeChat JSAPI needs the payer openid; the IAM anonymous payment OAuth
  // issues it against this capability token and returns to the token URL.
  const oauthParams = new URLSearchParams({
    cashierToken: token,
    redirect: `/#/cashier/${token}`,
  });
  const wechatAuthorizeUrl =
    `${resolveCloudRouterAppApiBaseUrl()}/app/v3/api/oauth/wechat/payment/cashier/start?${oauthParams.toString()}`;
  return (
    <Suspense
      fallback={(
        <div className="flex h-screen items-center justify-center bg-[var(--cr-canvas)] text-sm text-[var(--cr-ink-muted)]">
          {translate('cloudrouter.console.shared.loading')}
        </div>
      )}
    >
      <CloudRouterAnonymousCashierPage
        locale={locale}
        token={token}
        wechatAuthorizeUrl={wechatAuthorizeUrl}
      />
    </Suspense>
  );
}

export function RefundRequestsRoute() {
  return <OrderRouteShell page={CloudRouterRefundRequestsPage} />;
}
