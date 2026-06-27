import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcEntitlementRoutes = [
  {
    auth: "required",
    capability: "entitlement",
    domain: "commerce",
    id: "app.commerce.entitlement.dashboard",
    packageName: "@sdkwork/commerce-pc-entitlement",
    path: "/app/entitlement",
    screen: "dashboard",
    surface: "app",
    title: "Entitlements",
    titleKey: "entitlement.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
