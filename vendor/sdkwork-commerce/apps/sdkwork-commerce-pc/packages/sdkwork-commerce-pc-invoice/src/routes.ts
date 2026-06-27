import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcInvoiceRoutes = [
  {
    auth: "required",
    capability: "invoice",
    domain: "commerce",
    id: "app.commerce.invoice.dashboard",
    packageName: "@sdkwork/commerce-pc-invoice",
    path: "/app/invoice",
    screen: "dashboard",
    surface: "app",
    title: "Invoices",
    titleKey: "invoice.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
