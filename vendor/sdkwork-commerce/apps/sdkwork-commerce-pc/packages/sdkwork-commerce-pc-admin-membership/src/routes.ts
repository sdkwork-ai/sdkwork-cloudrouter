import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcAdminMembershipRoutes = [
  {
    auth: "required",
    capability: "membership-admin",
    domain: "commerce",
    id: "admin.commerce.membership-admin.dashboard",
    packageName: "@sdkwork/commerce-pc-admin-membership",
    path: "/admin/commerce/membership",
    permissionHint: "commerce.memberships.read",
    screen: "dashboard",
    surface: "backend-admin",
    title: "Membership Admin",
    titleKey: "admin.commerce.membership.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
