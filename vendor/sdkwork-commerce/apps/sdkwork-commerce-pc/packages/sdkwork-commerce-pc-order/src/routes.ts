import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcOrderRoutes = [
  {
    auth: "required",
    capability: "order",
    domain: "commerce",
    id: "app.commerce.order.dashboard",
    packageName: "@sdkwork/commerce-pc-order",
    path: "/app/order",
    screen: "dashboard",
    surface: "app",
    title: "Orders",
    titleKey: "order.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
