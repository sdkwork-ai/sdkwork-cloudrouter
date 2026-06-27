import { useEffect, useMemo } from 'react';
import { Route, useSearchParams } from 'react-router-dom';
import { SdkworkWalletPage } from '@sdkwork/account-pc-wallet';
import { SdkworkMembershipPage } from '@sdkwork/membership-pc-membership';
import { SdkworkSubscriptionPage } from '@sdkwork/membership-pc-subscription';
import { SdkworkCouponPage } from '@sdkwork/promotion-pc-coupon';
import {
  createSdkworkPaymentController,
  SdkworkPaymentPage,
} from '@sdkwork/payment-pc-payment';

import { useConsoleBusinessNavigation } from './consoleBusinessNavigation.ts';
import type { ClawRouterConsoleBusinessHostConfig } from './consoleBusinessConfig.ts';

export const CLAWROUTER_CONSOLE_BUSINESS_ROUTE_PREFIX = '/console';

export function ClawRouterConsoleBusinessHostRoutes() {
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
  const { checkoutPath, onNavigate } = useConsoleBusinessNavigation({
    routePrefix: CLAWROUTER_CONSOLE_BUSINESS_ROUTE_PREFIX,
  });

  return (
    <SdkworkWalletPage
      checkoutBasePath={checkoutPath}
      onNavigate={onNavigate}
      rechargeFlow="direct"
    />
  );
}

function ConsoleBusinessCouponsPage() {
  return <SdkworkCouponPage />;
}

function ConsoleBusinessMembershipPage() {
  const { checkoutPath, onNavigate } = useConsoleBusinessNavigation({
    routePrefix: CLAWROUTER_CONSOLE_BUSINESS_ROUTE_PREFIX,
  });

  return (
    <SdkworkMembershipPage
      checkoutBasePath={checkoutPath}
      onNavigate={onNavigate}
      purchaseFlow="checkout"
    />
  );
}

function ConsoleBusinessCheckoutPage() {
  return <SdkworkSubscriptionPage />;
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

  useEffect(() => {
    let cancelled = false;

    void controller.bootstrap().then(() => {
      if (cancelled || !paymentId) {
        return;
      }

      void controller.openDetail(paymentId);
    });

    return () => {
      cancelled = true;
    };
  }, [controller, paymentId]);

  return <SdkworkPaymentPage controller={controller} />;
}

export type { ClawRouterConsoleBusinessHostConfig };
