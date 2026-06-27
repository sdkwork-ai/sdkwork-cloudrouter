import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcWalletRoutes = [
  {
    auth: "required",
    capability: "wallet",
    domain: "commerce",
    id: "app.commerce.wallet.dashboard",
    packageName: "@sdkwork/commerce-pc-wallet",
    path: "/app/wallet",
    screen: "dashboard",
    surface: "app",
    title: "Wallet",
    titleKey: "wallet.routes.dashboard.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
