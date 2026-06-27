import type { SdkworkCommercePcRouteContribution } from "@sdkwork/commerce-pc-core";

export const sdkworkCommercePcAdminProductRoutes = [
  {
    auth: "required",
    capability: "product-admin",
    domain: "commerce",
    id: "admin.commerce.product-admin.catalog",
    packageName: "@sdkwork/commerce-pc-admin-product",
    path: "/admin/commerce/products",
    permissionHint: "commerce.products.read",
    screen: "catalog",
    surface: "backend-admin",
    title: "Product Admin",
    titleKey: "admin.commerce.product.routes.catalog.title",
  },
] as const satisfies readonly SdkworkCommercePcRouteContribution[];
