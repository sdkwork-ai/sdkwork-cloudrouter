import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcBillingRoutes = [
  {
    auth: "required",
    capability: "billing",
    domain: "commerce",
    id: "app.commerce.billing.dashboard",
    packageName: "@sdkwork/commerce-pc-billing",
    path: "/app/billing",
    screen: "dashboard",
    surface: "app",
    title: "Billing",
    titleKey: "billing.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
