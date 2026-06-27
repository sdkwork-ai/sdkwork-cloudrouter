import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";
import { CatalogAdmin } from "@sdkwork/commerce-pc-admin-product";

import {
  buildSdkworkCommercePcAuthLoginRedirect,
  hasSdkworkCommercePcAuthenticatedSession,
} from "./authGateLogic";
import type { SdkworkCommercePcRuntime } from "./bootstrap/runtime";

const SdkworkCommercePage = lazy(() =>
  import("@sdkwork/commerce-pc-commerce").then((module) => ({ default: module.SdkworkCommercePage })),
);
const SdkworkBillingPage = lazy(() =>
  import("@sdkwork/commerce-pc-billing").then((module) => ({ default: module.SdkworkBillingPage })),
);
const SdkworkWalletPage = lazy(() =>
  import("@sdkwork/commerce-pc-wallet").then((module) => ({ default: module.SdkworkWalletPage })),
);
const SdkworkPaymentPage = lazy(() =>
  import("@sdkwork/commerce-pc-payment").then((module) => ({ default: module.SdkworkPaymentPage })),
);
const SdkworkOrderPage = lazy(() =>
  import("@sdkwork/commerce-pc-order").then((module) => ({ default: module.SdkworkOrderPage })),
);
const SdkworkInvoicePage = lazy(() =>
  import("@sdkwork/commerce-pc-invoice").then((module) => ({ default: module.SdkworkInvoicePage })),
);
const SdkworkCouponPage = lazy(() =>
  import("@sdkwork/commerce-pc-coupon").then((module) => ({ default: module.SdkworkCouponPage })),
);
const SdkworkMembershipPage = lazy(() =>
  import("@sdkwork/commerce-pc-membership").then((module) => ({ default: module.SdkworkMembershipPage })),
);
const SdkworkSubscriptionPage = lazy(() =>
  import("@sdkwork/commerce-pc-subscription").then((module) => ({ default: module.SdkworkSubscriptionPage })),
);
const SdkworkPricingPage = lazy(() =>
  import("@sdkwork/commerce-pc-pricing").then((module) => ({ default: module.SdkworkPricingPage })),
);
const SdkworkPointsPage = lazy(() =>
  import("@sdkwork/commerce-pc-points").then((module) => ({ default: module.SdkworkPointsPage })),
);
const SdkworkOfferPage = lazy(() =>
  import("@sdkwork/commerce-pc-offer").then((module) => ({ default: module.SdkworkOfferPage })),
);
const SdkworkCheckoutPage = lazy(() =>
  import("@sdkwork/commerce-pc-checkout").then((module) => ({ default: module.SdkworkCheckoutPage })),
);
const SdkworkEntitlementPage = lazy(() =>
  import("@sdkwork/commerce-pc-entitlement").then((module) => ({ default: module.SdkworkEntitlementPage })),
);
const SdkworkMembershipAdminPage = lazy(() =>
  import("@sdkwork/commerce-pc-admin-membership").then((module) => ({
    default: module.SdkworkMembershipAdminPage,
  })),
);

export function AppRoutes({ runtime }: { runtime: SdkworkCommercePcRuntime }) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {runtime.routes.map((route) => (
          <Route
            element={(
              <ProtectedRoute auth={route.auth} runtime={runtime}>
                {resolveRouteScreen(route, runtime)}
              </ProtectedRoute>
            )}
            key={route.id}
            path={route.path}
          />
        ))}
        <Route element={<Navigate replace to="/app/commerce" />} path="/" />
        <Route element={<Navigate replace to="/app/commerce" />} path="*" />
      </Routes>
    </Suspense>
  );
}

function ProtectedRoute({
  auth,
  children,
  runtime,
}: {
  auth: SdkworkCommercePcRouteContribution["auth"];
  children: ReactNode;
  runtime: SdkworkCommercePcRuntime;
}) {
  const location = useLocation();
  const snapshot = runtime.session.getSnapshot();
  if (auth === "required" && !hasSdkworkCommercePcAuthenticatedSession(snapshot)) {
    return <Navigate replace to={buildSdkworkCommercePcAuthLoginRedirect(location)} />;
  }
  return <>{children}</>;
}

function resolveRouteScreen(
  route: SdkworkCommercePcRouteContribution,
  runtime: SdkworkCommercePcRuntime,
) {
  const locale = runtime.config.i18n.defaultLocale;
  switch (route.id) {
    case "app.commerce.commerce.dashboard":
      return <SdkworkCommercePage locale={locale} />;
    case "app.commerce.billing.dashboard":
      return <SdkworkBillingPage locale={locale} />;
    case "app.commerce.wallet.dashboard":
      return <SdkworkWalletPage locale={locale} />;
    case "app.commerce.payment.dashboard":
      return <SdkworkPaymentPage locale={locale} />;
    case "app.commerce.order.dashboard":
      return <SdkworkOrderPage locale={locale} />;
    case "app.commerce.invoice.dashboard":
      return <SdkworkInvoicePage locale={locale} />;
    case "app.commerce.coupon.dashboard":
      return <SdkworkCouponPage locale={locale} />;
    case "app.commerce.membership.dashboard":
      return <SdkworkMembershipPage locale={locale} />;
    case "app.commerce.subscription.dashboard":
      return <SdkworkSubscriptionPage locale={locale} />;
    case "app.commerce.pricing.dashboard":
      return <SdkworkPricingPage locale={locale} />;
    case "app.commerce.points.dashboard":
      return <SdkworkPointsPage locale={locale} />;
    case "app.commerce.offer.dashboard":
      return <SdkworkOfferPage locale={locale} />;
    case "app.commerce.checkout.dashboard":
      return <SdkworkCheckoutPage locale={locale} />;
    case "app.commerce.entitlement.dashboard":
      return <SdkworkEntitlementPage locale={locale} />;
    case "admin.commerce.product-admin.catalog":
      return <CatalogAdmin />;
    case "admin.commerce.membership-admin.dashboard":
      return <SdkworkMembershipAdminPage locale={locale} />;
    default:
      return <Navigate replace to="/app/commerce" />;
  }
}

function RouteLoadingFallback() {
  return (
    <div aria-label="Loading commerce workspace" className="sdkwork-commerce-pc-loading">
      Loading...
    </div>
  );
}
