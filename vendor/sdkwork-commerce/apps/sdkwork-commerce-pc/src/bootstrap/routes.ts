import {
  getSdkworkCommercePcBackendAdminRoutes,
  type SdkworkCommercePcAdminSurface,
} from "@sdkwork/commerce-pc-admin-shell";
import { sdkworkCommercePcAdminMembershipRoutes } from "@sdkwork/commerce-pc-admin-membership";
import { sdkworkCommercePcAdminProductRoutes } from "@sdkwork/commerce-pc-admin-product";
import { sdkworkCommercePcBillingRoutes } from "@sdkwork/commerce-pc-billing";
import { sdkworkCommercePcCheckoutRoutes } from "@sdkwork/commerce-pc-checkout";
import { sdkworkCommercePcCommerceRoutes } from "@sdkwork/commerce-pc-commerce";
import { sdkworkCommercePcCouponRoutes } from "@sdkwork/commerce-pc-coupon";
import { createSdkworkCommercePcRouteRegistry } from "@sdkwork/commerce-pc-core";
import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";
import { sdkworkCommercePcEntitlementRoutes } from "@sdkwork/commerce-pc-entitlement";
import { sdkworkCommercePcInvoiceRoutes } from "@sdkwork/commerce-pc-invoice";
import { sdkworkCommercePcMembershipRoutes } from "@sdkwork/commerce-pc-membership";
import { sdkworkCommercePcOfferRoutes } from "@sdkwork/commerce-pc-offer";
import { sdkworkCommercePcOrderRoutes } from "@sdkwork/commerce-pc-order";
import { sdkworkCommercePcPaymentRoutes } from "@sdkwork/commerce-pc-payment";
import { sdkworkCommercePcPointsRoutes } from "@sdkwork/commerce-pc-points";
import { sdkworkCommercePcPricingRoutes } from "@sdkwork/commerce-pc-pricing";
import { sdkworkCommercePcSubscriptionRoutes } from "@sdkwork/commerce-pc-subscription";
import { sdkworkCommercePcWalletRoutes } from "@sdkwork/commerce-pc-wallet";

export type { SdkworkCommercePcRouteContribution, SdkworkCommercePcAdminSurface };

export const sdkworkCommercePcRoutes = createSdkworkCommercePcRouteRegistry(
  sdkworkCommercePcCommerceRoutes,
  sdkworkCommercePcBillingRoutes,
  sdkworkCommercePcWalletRoutes,
  sdkworkCommercePcPaymentRoutes,
  sdkworkCommercePcOrderRoutes,
  sdkworkCommercePcInvoiceRoutes,
  sdkworkCommercePcCouponRoutes,
  sdkworkCommercePcMembershipRoutes,
  sdkworkCommercePcSubscriptionRoutes,
  sdkworkCommercePcPricingRoutes,
  sdkworkCommercePcPointsRoutes,
  sdkworkCommercePcOfferRoutes,
  sdkworkCommercePcCheckoutRoutes,
  sdkworkCommercePcEntitlementRoutes,
  sdkworkCommercePcAdminProductRoutes,
  sdkworkCommercePcAdminMembershipRoutes,
);

export const sdkworkCommercePcBackendAdminRoutes =
  getSdkworkCommercePcBackendAdminRoutes(sdkworkCommercePcRoutes);
