import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SdkworkCheckoutPage } from "@sdkwork/commerce-pc-checkout";
import { SdkworkMembershipPage } from "@sdkwork/commerce-pc-membership";
import { SdkworkWalletPage } from "@sdkwork/commerce-pc-wallet";
import {
  createSdkworkPaymentController,
  SdkworkPaymentPage,
} from "@sdkwork/commerce-pc-payment";
import type { SdkworkCommerceHostConfig } from "./commerce-host-config.ts";
import { useSdkworkCommerceHostNavigation } from "./commerce-host-navigation-hook.ts";

export interface SdkworkCommerceHostPageProps extends SdkworkCommerceHostConfig {}

export function SdkworkCommerceHostWalletPage({
  routePrefix,
}: SdkworkCommerceHostPageProps) {
  const { checkoutPath, onNavigate } = useSdkworkCommerceHostNavigation({ routePrefix });

  return (
    <SdkworkWalletPage
      checkoutBasePath={checkoutPath}
      onNavigate={onNavigate}
    />
  );
}

export function SdkworkCommerceHostMembershipPage({
  routePrefix,
}: SdkworkCommerceHostPageProps) {
  const { checkoutPath, onNavigate } = useSdkworkCommerceHostNavigation({ routePrefix });

  return (
    <SdkworkMembershipPage
      checkoutBasePath={checkoutPath}
      onNavigate={onNavigate}
    />
  );
}

export function SdkworkCommerceHostCheckoutPage({
  routePrefix,
}: SdkworkCommerceHostPageProps) {
  const { onNavigate } = useSdkworkCommerceHostNavigation({ routePrefix });
  const [searchParams] = useSearchParams();

  return (
    <SdkworkCheckoutPage
      onNavigate={onNavigate}
      routeSearchParams={searchParams}
    />
  );
}

export function SdkworkCommerceHostPaymentPage({
  routePrefix,
}: SdkworkCommerceHostPageProps) {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("paymentId") ?? undefined;

  return <SdkworkCommerceHostPaymentPageContent paymentId={paymentId} routePrefix={routePrefix} />;
}

function SdkworkCommerceHostPaymentPageContent({
  paymentId,
  routePrefix,
}: SdkworkCommerceHostPageProps & { paymentId?: string }) {
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
