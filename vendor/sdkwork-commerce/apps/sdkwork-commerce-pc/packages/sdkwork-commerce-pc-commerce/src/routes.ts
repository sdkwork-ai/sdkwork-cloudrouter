import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcCommerceRoutes = [
  {
    auth: "required",
    capability: "commerce",
    domain: "commerce",
    id: "app.commerce.commerce.dashboard",
    packageName: "@sdkwork/commerce-pc-commerce",
    path: "/app/commerce",
    screen: "dashboard",
    surface: "app",
    title: "Commerce",
    titleKey: "commerce.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
