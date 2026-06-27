import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcPointsRoutes = [
  {
    auth: "required",
    capability: "points",
    domain: "commerce",
    id: "app.commerce.points.dashboard",
    packageName: "@sdkwork/commerce-pc-points",
    path: "/app/points",
    screen: "dashboard",
    surface: "app",
    title: "Points",
    titleKey: "points.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
