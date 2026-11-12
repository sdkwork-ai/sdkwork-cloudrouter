import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SubscriptionPurchasePage as SdkworkSubscriptionPage } from '@sdkwork/order-pc-subscription';
import { SdkworkCouponPage, createSdkworkCouponController, type SdkworkUserCoupon } from '@sdkwork/promotion-pc-coupon';
import {
  createSdkworkPaymentController,
  SdkworkPaymentPage,
  useSdkworkPaymentControllerState,
} from '@sdkwork/payment-pc-payment';
import { Route, useSearchParams } from 'react-router-dom';

import { resolveConsoleCouponLocale } from './consoleCommerceLocale.ts';
import { getCloudRouterCouponRechargeService } from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';
import { createClientOperationToken } from '@sdkwork/cloudroutes-pc-commons/idempotency';
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
  const orderCouponService = useMemo(() => getCloudRouterCouponRechargeService(), []);
  // One idempotency intent per entered code: a retry after the coupon was
  // consumed but delivery failed must replay the original order instead of
  // consuming a second claim.
  const couponIntentRef = useRef<{ code: string; idempotencyKey: string } | null>(null);
  // The promotion coupon-center dialog historically called the promotion-owned
  // direct redemption route, which writes the non-existent `commerce_account`
  // table. Cloud Router redeems through the order-owned path (the same one the
  // wallet uses), so override only the redeem action while the rest of the
  // coupon center keeps using the promotion wallet/catalog services.
  const controller = useMemo(
    () =>
      createSdkworkCouponController({
        locale,
        service: {
          redeemCoupon: async (input) => {
            const normalizedCode = input.redeemCode.trim();
            const idempotencyKey =
              couponIntentRef.current?.code === normalizedCode
                ? couponIntentRef.current.idempotencyKey
                : createClientOperationToken('coupon-redemption');
            couponIntentRef.current = { code: normalizedCode, idempotencyKey };
            const result = await orderCouponService.redeem(normalizedCode, idempotencyKey);
            couponIntentRef.current = null;
            // The controller only needs an id to select a row and refresh the
            // wallet; the order result is authoritative for the grant itself.
            return {
              id: `order-${result.orderId}`,
              name: '',
              amountCny: null,
              available: false,
              minimumSpendCny: null,
              pointCost: null,
              pointsRefunded: false,
              remainingDays: null,
              status: 'used',
              type: 'unknown',
            } satisfies SdkworkUserCoupon;
          },
        },
      }),
    [locale, orderCouponService],
  );

  return (
    <ConsoleBusinessPageFrame surface="coupons">
      <SdkworkCouponPage controller={controller} locale={locale} />
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
