import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ComponentType, type LazyExoticComponent } from 'react';
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
  readonly requestWechatAuthorizeUrl?: () => Promise<string>;
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

type CashierEntryErrorPageProps = {
  readonly locale: SdkworkConsoleLocale;
  readonly message?: string;
};

function lazyCashierEntryErrorPage(
  exportName: string,
): LazyExoticComponent<ComponentType<CashierEntryErrorPageProps>> {
  return lazy(async () => {
    const module = await import('@sdkwork/cloudrouter-h5-orders');
    const page = module[exportName as keyof typeof module];
    if (!page) {
      throw new Error(`CloudRouter order page ${exportName} is not exported.`);
    }
    return { default: page as ComponentType<CashierEntryErrorPageProps> };
  });
}

const CloudRouterCashierEntryErrorPage = lazyCashierEntryErrorPage(
  'CloudRouterCashierEntryErrorPage',
);
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
  | { readonly kind: 'failed'; readonly message: string };

const MISSING_TRADE_NO_MESSAGE =
  '该收款链接缺少支付流水号，请重新扫码或向商家索取新的二维码。';
const INCOMPLETE_LINK_MESSAGE =
  '该收款链接不完整，请重新扫码或向商家索取新的二维码。';
const EXCHANGE_FAILED_MESSAGE =
  '暂时无法打开该笔支付，请稍后重试或重新扫码。';

/**
 * Resolves the capability for the cashier entry path segment.
 *
 * A signed token is used as-is. A legacy pair (`orderId` + `outTradeNo`) is
 * exchanged for a token. Every failure ends in an explicit `failed` state — never
 * the login gate: a payer scanning a QR has no account context, so turning the
 * payment page into a sign-in form is not a recovery they can act on.
 */
function useCashierEntryResolution(orderId: string | undefined): CashierEntryResolution {
  const [searchParams] = useSearchParams();
  const outTradeNo = searchParams.get('outTradeNo');
  const plan = useMemo(
    () => planCashierEntry(orderId, outTradeNo),
    [orderId, outTradeNo],
  );
  const [resolution, setResolution] = useState<CashierEntryResolution>(() => {
    if (plan.kind === 'token') return { kind: 'resolved', token: plan.token };
    if (plan.kind === 'exchange') return { kind: 'pending' };
    return {
      kind: 'failed',
      message: plan.reason === 'missing-trade-no'
        ? MISSING_TRADE_NO_MESSAGE
        : INCOMPLETE_LINK_MESSAGE,
    };
  });

  useEffect(() => {
    if (plan.kind === 'token') {
      setResolution({ kind: 'resolved', token: plan.token });
      return undefined;
    }
    if (plan.kind === 'invalid') {
      setResolution({
        kind: 'failed',
        message: plan.reason === 'missing-trade-no'
          ? MISSING_TRADE_NO_MESSAGE
          : INCOMPLETE_LINK_MESSAGE,
      });
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
          // (no deployment secret, wrong trade number, unknown order, transient
          // outage) the payer still gets the cashier chrome plus a toast, so the
          // failure is explained instead of silently becoming a login form.
          if (!cancelled) {
            setResolution({ kind: 'failed', message: EXCHANGE_FAILED_MESSAGE });
          }
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
 * - anything else renders the cashier error shell with a toast. It never routes
 *   to sign-in.
 */
export function CashierEntryRoute() {
  const { orderId } = useParams<{ orderId: string }>();
  const { locale, translate } = useConsoleRuntime();
  const resolution = useCashierEntryResolution(orderId);
  const resolvedToken = resolution.kind === 'resolved' ? resolution.token : '';
  const wechatOAuthStartUrl = useMemo(() => {
    if (!resolvedToken) {
      return '';
    }
    const oauthParams = new URLSearchParams({
      cashierToken: resolvedToken,
      redirect: `/cashier/${resolvedToken}`,
    });
    return `${resolveCloudRouterAppApiBaseUrl()}/app/v3/api/oauth/wechat/payment/cashier/start?${oauthParams.toString()}`;
  }, [resolvedToken]);
  /**
   * The IAM start endpoint returns JSON `{ data: { authorizeUrl } }`; it must be
   * fetched, never used as a navigation target. The page then navigates to the
   * returned WeChat authorize URL, so the payer lands in WeChat instead of on the
   * raw API response page.
   */
  const requestWechatAuthorizeUrl = useCallback(async () => {
    if (!wechatOAuthStartUrl) {
      throw new Error('WeChat payment authorization is not configured for this cashier');
    }
    const response = await fetch(wechatOAuthStartUrl, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`WeChat payment authorization failed (${response.status})`);
    }
    const payload = (await response.json()) as {
      data?: { authorizeUrl?: string; item?: { authorizeUrl?: string } };
    };
    const authorizeUrl = (payload.data?.authorizeUrl ?? payload.data?.item?.authorizeUrl ?? '').trim();
    if (!/^https:\/\/open\.weixin\.qq\.com\/connect\/oauth2\/authorize\?/iu.test(authorizeUrl)) {
      throw new Error('WeChat payment authorization returned an unexpected URL');
    }
    return authorizeUrl;
  }, [wechatOAuthStartUrl]);

  if (resolution.kind === 'pending') {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--cr-canvas)] text-sm text-[var(--cr-ink-muted)]">
        {translate('cloudrouter.console.shared.loading')}
      </div>
    );
  }

  if (resolution.kind === 'failed') {
    return (
      <Suspense
        fallback={(
          <div className="flex h-screen items-center justify-center bg-[var(--cr-canvas)] text-sm text-[var(--cr-ink-muted)]">
            {translate('cloudrouter.console.shared.loading')}
          </div>
        )}
      >
        <CloudRouterCashierEntryErrorPage locale={locale} message={resolution.message} />
      </Suspense>
    );
  }

  const token = resolution.token;
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
        requestWechatAuthorizeUrl={requestWechatAuthorizeUrl}
      />
    </Suspense>
  );
}

export function RefundRequestsRoute() {
  return <OrderRouteShell page={CloudRouterRefundRequestsPage} />;
}
