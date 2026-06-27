import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcOfferRoutes = [
  {
    auth: "required",
    capability: "offer",
    domain: "commerce",
    id: "app.commerce.offer.dashboard",
    packageName: "@sdkwork/commerce-pc-offer",
    path: "/app/offer",
    screen: "dashboard",
    surface: "app",
    title: "Offers",
    titleKey: "offer.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
