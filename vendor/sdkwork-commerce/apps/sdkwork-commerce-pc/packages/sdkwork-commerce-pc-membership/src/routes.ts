import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcMembershipRoutes = [
  {
    auth: "required",
    capability: "membership",
    domain: "commerce",
    id: "app.commerce.membership.dashboard",
    packageName: "@sdkwork/commerce-pc-membership",
    path: "/app/membership",
    screen: "dashboard",
    surface: "app",
    title: "Membership",
    titleKey: "membership.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
