/**
 * Public page surface of the Product Center.
 *
 * The host admin route table lazy-loads these components and resolves the
 * owning-module SDK clients inside `productCenterService`; a page never imports
 * a transport client factory itself.
 */

export { ProductCenterOverviewPage } from './pages/ProductCenterOverviewPage.tsx';
export {
  ProductListPage,
  SkuListPage,
  BrandListPage,
  type ProductListPageProps,
} from './pages/ProductCatalogPages.tsx';
export { ProductDetailPage, type ProductDetailPageProps } from './pages/ProductDetailPage.tsx';
export { PriceListPage } from './pages/PriceListPage.tsx';
export { CategoryListPage, AttributeListPage } from './pages/CategoryAttributePages.tsx';
export { CarrierListPage } from './pages/CarrierListPage.tsx';
export { CategoryTreePage } from './pages/CategoryTreePage.tsx';
export { StockListPage, MovementListPage, ReservationListPage } from './pages/InventoryPages.tsx';
export { ShipmentListPage, LogisticsTrackingPage } from './pages/FulfillmentPages.tsx';
export {
  ResourceListPanel,
  ResourcePageFrame,
  requireString,
  useResourceList,
  type ProductCenterPageProps,
  type ResourceListState,
  type ResourceQueryState,
  type RowActionContext,
} from './pages/resourcePage.tsx';

export {
  createProductCenterService,
  describeProductCenterError,
  getProductCenterService,
  type Attribute,
  type AttributeValue,
  type Brand,
  type Category,
  type CategoryAttribute,
  type InventoryMovement,
  type InventoryReservation,
  type InventoryStock,
  type Media,
  type MediaResource,
  type PriceList,
  type PriceListItem,
  type Product,
  type ProductAttributeValueInput,
  type ProductCenterError,
  type ProductCenterOverview,
  type ProductCenterOverviewSource,
  type ProductCenterPage,
  type ProductCenterPageInfo,
  type ProductCenterService,
  type ProductCenterServiceDeps,
  type ShipmentPackageSummary,
  type ShipmentSummary,
  type ShipmentTrackingEventSummary,
  type TrackingEventListQuery,
  type Sku,
} from './productCenterService.ts';

export {
  PRODUCT_CENTER_ADMIN_DEFAULT_PATH,
  PRODUCT_CENTER_ADMIN_MENU,
  PRODUCT_CENTER_ADMIN_MODULE_DEF,
  PRODUCT_CENTER_ADMIN_PERMISSION_HINTS,
  PRODUCT_CENTER_ADMIN_ROUTE_PREFIX,
  PRODUCT_CENTER_ADMIN_ROUTE_RECORDS,
  PRODUCT_CENTER_ADMIN_SCREENS,
  type SdkworkProductCenterAdminMenu,
  type SdkworkProductCenterAdminMenuGroup,
  type SdkworkProductCenterAdminMenuItem,
  type SdkworkProductCenterAdminModuleDef,
  type SdkworkProductCenterAdminPermissionHint,
  type SdkworkProductCenterAdminRouteRecord,
  type SdkworkProductCenterAdminScreen,
} from './contribution.ts';
