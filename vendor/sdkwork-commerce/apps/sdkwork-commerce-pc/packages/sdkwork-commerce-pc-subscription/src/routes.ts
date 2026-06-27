import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcSubscriptionRoutes = [
  {
    auth: "required",
    capability: "subscription",
    domain: "commerce",
    id: "app.commerce.subscription.dashboard",
    packageName: "@sdkwork/commerce-pc-subscription",
    path: "/app/subscription",
    screen: "dashboard",
    surface: "app",
    title: "Subscription",
    titleKey: "subscription.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
