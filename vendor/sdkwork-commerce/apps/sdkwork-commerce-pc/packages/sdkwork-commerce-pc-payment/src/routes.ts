import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcPaymentRoutes = [
  {
    auth: "required",
    capability: "payment",
    domain: "commerce",
    id: "app.commerce.payment.dashboard",
    packageName: "@sdkwork/commerce-pc-payment",
    path: "/app/payment",
    screen: "dashboard",
    surface: "app",
    title: "Payment",
    titleKey: "payment.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
