import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcPricingRoutes = [
  {
    auth: "required",
    capability: "pricing",
    domain: "commerce",
    id: "app.commerce.pricing.dashboard",
    packageName: "@sdkwork/commerce-pc-pricing",
    path: "/app/pricing",
    screen: "dashboard",
    surface: "app",
    title: "Pricing",
    titleKey: "pricing.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
