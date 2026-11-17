import {
  ArrowLeftRight,
  Boxes,
  Barcode,
  Coins,
  FolderTree,
  LayoutDashboard,
  ListTree,
  PackageCheck,
  PackageSearch,
  Route,
  Tags,
  Truck,
  Ship,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

/**
 * Product Center (商品中心) admin contribution.
 *
 * The Cloud Router admin shell is a composition host: it renders the module
 * definition in the header, the menu groups in the sidebar, and the route
 * records in the admin route table. Everything a Product Center operator
 * navigates lives here, so the host never re-declares this information
 * architecture.
 *
 * The information architecture follows the industry-standard commerce chain an
 * operator reasons about:
 *
 *   catalog (products → SKUs → brands) → taxonomy (categories → category
 *   attributes) → inventory (stock levels → movements → reservations) →
 *   fulfillment (shipments → logistics tracking).
 *
 * The screens do not own domain behavior. `@sdkwork/shop-backend-sdk`
 * (catalog), `@sdkwork/inventory-backend-sdk` (stock) and
 * `@sdkwork/order-backend-sdk` (shipments) are the authorities; the host only
 * projects their management contracts into UI.
 */

export const PRODUCT_CENTER_ADMIN_ROUTE_PREFIX = '/admin/products';

export const PRODUCT_CENTER_ADMIN_DEFAULT_PATH = '/admin/products';

export interface SdkworkProductCenterAdminModuleDef {
  id: 'productCenter';
  nameKey: string;
  icon: LucideIcon;
  defaultPath: string;
  pathPrefixes: string[];
}

export const PRODUCT_CENTER_ADMIN_MODULE_DEF: SdkworkProductCenterAdminModuleDef = {
  id: 'productCenter',
  nameKey: 'admin.header.productCenter',
  icon: Boxes,
  defaultPath: PRODUCT_CENTER_ADMIN_DEFAULT_PATH,
  pathPrefixes: [PRODUCT_CENTER_ADMIN_ROUTE_PREFIX],
};

export interface SdkworkProductCenterAdminMenuItem {
  path: string;
  labelKey: string;
  icon: LucideIcon;
  iconColor?: string;
}

export interface SdkworkProductCenterAdminMenuGroup {
  groupKey: string;
  items: SdkworkProductCenterAdminMenuItem[];
}

export interface SdkworkProductCenterAdminMenu {
  moduleId: 'productCenter';
  items?: SdkworkProductCenterAdminMenuItem[];
  groups: SdkworkProductCenterAdminMenuGroup[];
}

export const PRODUCT_CENTER_ADMIN_MENU: SdkworkProductCenterAdminMenu = {
  moduleId: 'productCenter',
  items: [
    {
      path: '/admin/products',
      labelKey: 'admin.menu.productCenter.overview',
      icon: LayoutDashboard,
    },
  ],
  groups: [
    {
      groupKey: 'admin.menu.productCenter.catalogGroup',
      items: [
        {
          path: '/admin/products/list',
          labelKey: 'admin.menu.productCenter.products',
          icon: PackageSearch,
          iconColor: 'text-lobster-400',
        },
        {
          path: '/admin/products/skus',
          labelKey: 'admin.menu.productCenter.skus',
          icon: Barcode,
          iconColor: 'text-lobster-400',
        },
        {
          path: '/admin/products/brands',
          labelKey: 'admin.menu.productCenter.brands',
          icon: Tags,
        },
      ],
    },
    {
      groupKey: 'admin.menu.productCenter.taxonomyGroup',
      items: [
        {
          path: '/admin/products/categories',
          labelKey: 'admin.menu.productCenter.categories',
          icon: FolderTree,
          iconColor: 'text-lobster-400',
        },
        {
          path: '/admin/products/category-tree',
          labelKey: 'admin.menu.productCenter.categoryTree',
          icon: ListTree,
          iconColor: 'text-lobster-400',
        },
        {
          path: '/admin/products/attributes',
          labelKey: 'admin.menu.productCenter.attributes',
          icon: ArrowLeftRight,
          iconColor: 'text-lobster-400',
        },
      ],
    },
    {
      groupKey: 'admin.menu.productCenter.pricingGroup',
      items: [
        {
          path: '/admin/products/pricing',
          labelKey: 'admin.menu.productCenter.priceLists',
          icon: Coins,
          iconColor: 'text-amber-500',
        },
      ],
    },
    {
      groupKey: 'admin.menu.productCenter.inventoryGroup',
      items: [
        {
          path: '/admin/products/inventory',
          labelKey: 'admin.menu.productCenter.stocks',
          icon: Warehouse,
        },
        {
          path: '/admin/products/inventory/movements',
          labelKey: 'admin.menu.productCenter.movements',
          icon: ArrowLeftRight,
        },
        {
          path: '/admin/products/inventory/reservations',
          labelKey: 'admin.menu.productCenter.reservations',
          icon: PackageCheck,
        },
      ],
    },
    {
      groupKey: 'admin.menu.productCenter.fulfillmentGroup',
      items: [
        {
          path: '/admin/products/shipments',
          labelKey: 'admin.menu.productCenter.shipments',
          icon: Truck,
          iconColor: 'text-cyan-500',
        },
        {
          path: '/admin/products/logistics',
          labelKey: 'admin.menu.productCenter.logistics',
          icon: Route,
          iconColor: 'text-cyan-500',
        },
        {
          path: '/admin/products/carriers',
          labelKey: 'admin.menu.productCenter.carriers',
          icon: Ship,
          iconColor: 'text-cyan-500',
        },
      ],
    },
  ],
};

/** Screen ids, also the `screen` a route record resolves to. */
export const PRODUCT_CENTER_ADMIN_SCREENS = [
  'overview',
  'products',
  'product-detail',
  'skus',
  'brands',
  'categories',
  'category-tree',
  'attributes',
  'price-lists',
  'stocks',
  'movements',
  'reservations',
  'shipments',
  'logistics',
  'carriers',
] as const;

export type SdkworkProductCenterAdminScreen = (typeof PRODUCT_CENTER_ADMIN_SCREENS)[number];

export interface SdkworkProductCenterAdminRouteRecord {
  path: string;
  requiredPermission: string;
  redirectTo?: string;
  screen: SdkworkProductCenterAdminScreen;
}

export const PRODUCT_CENTER_ADMIN_ROUTE_RECORDS: readonly SdkworkProductCenterAdminRouteRecord[] = [
  {
    path: 'products',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'overview',
  },
  {
    path: 'products/list',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'products',
  },
  {
    path: 'products/:productId',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'product-detail',
  },
  {
    path: 'products/pricing',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'price-lists',
  },
  {
    path: 'products/skus',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'skus',
  },
  {
    path: 'products/brands',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'brands',
  },
  {
    path: 'products/categories',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'categories',
  },
  {
    path: 'products/category-tree',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'category-tree',
  },
  {
    path: 'products/attributes',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'attributes',
  },
  {
    path: 'products/inventory',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'stocks',
  },
  {
    path: 'products/inventory/movements',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'movements',
  },
  {
    path: 'products/inventory/reservations',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'reservations',
  },
  {
    path: 'products/shipments',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'shipments',
  },
  {
    path: 'products/logistics',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'logistics',
  },
  {
    path: 'products/carriers',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'carriers',
  },
];

export interface SdkworkProductCenterAdminPermissionHint {
  pathPrefix: string;
  requiredPermission: string;
}

export const PRODUCT_CENTER_ADMIN_PERMISSION_HINTS: readonly SdkworkProductCenterAdminPermissionHint[] = [
  { pathPrefix: '/admin/products', requiredPermission: 'cloudrouter.admin.access' },
];
