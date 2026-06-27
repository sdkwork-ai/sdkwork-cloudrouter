import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcCouponRoutes = [
  {
    auth: "required",
    capability: "coupon",
    domain: "commerce",
    id: "app.commerce.coupon.dashboard",
    packageName: "@sdkwork/commerce-pc-coupon",
    path: "/app/coupon",
    screen: "dashboard",
    surface: "app",
    title: "Coupons",
    titleKey: "coupon.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
