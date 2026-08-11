import { useEffect, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SubscriptionPurchasePage as SdkworkSubscriptionPage } from '@sdkwork/order-pc-subscription';
import { SdkworkCouponPage } from '@sdkwork/promotion-pc-coupon';
import {
  createSdkworkPaymentController,
  SdkworkPaymentPage,
  useSdkworkPaymentControllerState,
} from '@sdkwork/payment-pc-payment';
import { Route, useSearchParams } from 'react-router-dom';

import { resolveConsoleCouponLocale } from './consoleCommerceLocale.ts';
import type { CloudRouterConsoleBusinessHostConfig } from './consoleBusinessConfig.ts';
import { CloudRouterWalletPage } from './CloudRouterWalletPage.tsx';
import { CloudRouterMembershipPage } from './CloudRouterMembershipPage.tsx';

export const CLOUDROUTER_CONSOLE_BUSINESS_ROUTE_PREFIX = '/console';

type ConsoleBusinessPageSurface = 'checkout' | 'coupons' | 'payment';

function ConsoleBusinessPageFrame({
  children,
  surface,
}: {
  children: ReactNode;
  surface: ConsoleBusinessPageSurface;
}) {
  return (
    <div
      className="cloud-router-console-business-page h-full min-h-0 w-full max-w-none"
      data-console-business-page={surface}
    >
      {children}
    </div>
  );
}

export function CloudRouterConsoleBusinessHostRoutes() {
  return (
    <>
      <Route path="wallet" element={<ConsoleBusinessWalletPage />} />
      <Route path="coupons" element={<ConsoleBusinessCouponsPage />} />
      <Route path="memberships" element={<ConsoleBusinessMembershipPage />} />
      <Route path="checkout" element={<ConsoleBusinessCheckoutPage />} />
      <Route path="payment" element={<ConsoleBusinessPaymentPage />} />
    </>
  );
}

function ConsoleBusinessWalletPage() {
  return <CloudRouterWalletPage />;
}

function ConsoleBusinessCouponsPage() {
  const { i18n } = useTranslation();
  const locale = resolveConsoleCouponLocale(i18n.resolvedLanguage ?? i18n.language);

  return (
    <ConsoleBusinessPageFrame surface="coupons">
      <SdkworkCouponPage locale={locale} />
    </ConsoleBusinessPageFrame>
  );
}

function ConsoleBusinessMembershipPage() {
  return <CloudRouterMembershipPage />;
}

function ConsoleBusinessCheckoutPage() {
  return (
    <ConsoleBusinessPageFrame surface="checkout">
      <SdkworkSubscriptionPage />
    </ConsoleBusinessPageFrame>
  );
}

function ConsoleBusinessPaymentPage() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId') ?? undefined;

  return <ConsoleBusinessPaymentPageContent paymentId={paymentId} />;
}

function ConsoleBusinessPaymentPageContent({
  paymentId,
}: {
  paymentId?: string;
}) {
  const controller = useMemo(() => createSdkworkPaymentController(), []);
  const state = useSdkworkPaymentControllerState(controller);

  useEffect(() => {
    if (!paymentId || !state.isBootstrapped || state.isLoading || state.lastError) {
      return;
    }

    void controller.openDetail(paymentId).catch(() => undefined);
  }, [controller, paymentId, state.isBootstrapped, state.isLoading, state.lastError]);

  return (
    <ConsoleBusinessPageFrame surface="payment">
      <SdkworkPaymentPage controller={controller} />
    </ConsoleBusinessPageFrame>
  );
}

export type { CloudRouterConsoleBusinessHostConfig };
