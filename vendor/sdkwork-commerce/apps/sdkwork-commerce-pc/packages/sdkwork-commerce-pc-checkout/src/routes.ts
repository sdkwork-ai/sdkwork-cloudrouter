import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcCheckoutRoutes = [
  {
    auth: "required",
    capability: "checkout",
    domain: "commerce",
    id: "app.commerce.checkout.dashboard",
    packageName: "@sdkwork/commerce-pc-checkout",
    path: "/app/checkout",
    screen: "dashboard",
    surface: "app",
    title: "Checkout",
    titleKey: "checkout.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
