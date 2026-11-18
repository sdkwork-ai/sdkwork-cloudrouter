import type {
  Attribute,
  AttributeValue,
  Brand,
  Category,
  CategoryAttribute,
  CreateAttributeRequest,
  CreateAttributeValueRequest,
  CreateBrandRequest,
  CreateCategoryAttributeRequest,
  CreateCategoryRequest,
  CreateMediaRequest,
  CreatePriceListItemRequest,
  CreatePriceListRequest,
  CreateProductRequest,
  CreateSkuRequest,
  Media,
  PriceList,
  PriceListItem,
  Product,
  ProductAttributeValueInput,
  ProductAttributes,
  SdkworkBackendClient as ShopBackendClient,
  Sku,
  UpdateAttributeRequest,
  UpdateAttributeValueRequest,
  UpdateBrandRequest,
  UpdateCategoryAttributeRequest,
  UpdateCategoryRequest,
  UpdateMediaRequest,
  UpdatePriceListItemRequest,
  UpdatePriceListRequest,
  UpdateProductRequest,
  UpdateSkuRequest,
} from '@sdkwork/shop-backend-sdk';
import type {
  AdjustInventoryStockRequest,
  InventoryMovement,
  InventoryReservation,
  InventoryStock,
  SdkworkBackendClient as InventoryBackendClient,
  UpdateInventoryStockRequest,
} from '@sdkwork/inventory-backend-sdk';
import type {
  CarrierSummary,
  CreateCarrierRequest,
  CreateShipmentPackageRequest,
  CreateShipmentRequest,
  CreateShipmentTrackingEventRequest,
  FulfillmentSummary,
  SdkworkOrderBackendClient,
  ShipmentPackageSummary,
  ShipmentSummary,
  ShipmentTrackingEventSummary,
  UpdateCarrierRequest,
  UpdateShipmentPackageRequest,
} from '@sdkwork/order-backend-sdk';
import {
  getSdkworkInventoryBackendSdkClient,
  getSdkworkOrderBackendSdkClient,
  getSdkworkShopBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import { createIdempotencyParams } from '@sdkwork/cloudroutes-pc-commons/idempotency';

/**
 * Product Center data service.
 *
 * Every read and write is delegated to the generated management SDK of the
 * module that owns the domain:
 *
 * - catalog (products, SKUs, categories, category attributes, brands, media)
 *   → the generated shop catalog management SDK
 * - stock (levels, movements, reservations)
 *   → the generated inventory backend SDK
 * - fulfillment (shipments, packages, tracking events, carriers)
 *   → the generated order backend SDK
 *
 * The Product Center never re-implements a domain rule (pricing, publish
 * gates, If-Match versioning, stock reservation semantics): those live in the
 * owning backend, so this service stays a thin, typed projection of the
 * contracts. Optimistic concurrency is preserved end to end — every write that
 * the backend guards with `If-Match` receives the `version` the caller read.
 */
export type { Attribute, Brand, Category, CategoryAttribute, Product, Sku } from '@sdkwork/shop-backend-sdk';
export type {
  AttributeValue,
  Media,
  MediaResource,
  PriceList,
  PriceListItem,
  ProductAttributeValueInput,
} from '@sdkwork/shop-backend-sdk';
export type {
  AdjustInventoryStockRequest,
  InventoryMovement,
  InventoryReservation,
  InventoryStock,
} from '@sdkwork/inventory-backend-sdk';
export type {
  CarrierSummary,
  CreateCarrierRequest,
  FulfillmentSummary,
  ShipmentPackageSummary,
  ShipmentSummary,
  ShipmentTrackingEventSummary,
  UpdateCarrierRequest,
} from '@sdkwork/order-backend-sdk';

type CatalogPort = ShopBackendClient['catalog'];
type InventoryPort = InventoryBackendClient['inventory'];
type ShipmentsPort = SdkworkOrderBackendClient['orderAdminShipments']['shipments'];
type CarriersPort = SdkworkOrderBackendClient['orderAdminShipments']['carriers'];
type FulfillmentsPort = SdkworkOrderBackendClient['orderAdminShipments']['fulfillments'];

/**
 * Generated-SDK port shapes the Product Center consumes. Exported so a test or
 * an embedding host can bind a stub transport without importing a client.
 */
export type ProductCenterCatalogPort = CatalogPort;
export type ProductCenterInventoryPort = InventoryPort;
export type ProductCenterShipmentsPort = ShipmentsPort;
export type ProductCenterCarriersPort = CarriersPort;
export type ProductCenterFulfillmentsPort = FulfillmentsPort;

export interface ProductCenterPageInfo {
  page: number;
  pageSize: number;
  totalItems?: number;
  hasNextPage: boolean;
}

export interface ProductCenterPage<T> {
  items: T[];
  pageInfo: ProductCenterPageInfo;
}

export interface ProductCenterPageQuery {
  page: number;
  pageSize: number;
}

export interface ProductListQuery extends ProductCenterPageQuery {
  q?: string;
  categoryId?: string;
  brandId?: string;
  productType?: string;
  status?: string;
}

export interface SkuListQuery extends ProductCenterPageQuery {
  productId?: string;
  status?: string;
}

export interface CategoryListQuery extends ProductCenterPageQuery {
  parentId?: string;
  /** Restricts the page to root categories (`parent_id IS NULL`). */
  rootOnly?: boolean;
  status?: string;
}

export interface AttributeListQuery extends ProductCenterPageQuery {
  status?: string;
}

export interface CategoryAttributeListQuery extends ProductCenterPageQuery {
  categoryId?: string;
  attributeId?: string;
  status?: string;
}

export interface BrandListQuery extends ProductCenterPageQuery {
  status?: string;
}

/** Enum values of one attribute (size, colour, ...). */
export interface AttributeValueListQuery extends ProductCenterPageQuery {
  attributeId: string;
  status?: string;
}

/** Media attached to one owner (`spu` for a product, `sku` for a variant). */
export interface MediaListQuery extends ProductCenterPageQuery {
  ownerType: 'spu' | 'sku' | 'category' | 'attribute_value' | 'brand';
  ownerId: string;
  mediaRole?: string;
  status?: string;
}

export interface PriceListListQuery extends ProductCenterPageQuery {
  status?: string;
  currencyCode?: string;
  marketCode?: string;
}

export interface PriceListItemListQuery extends ProductCenterPageQuery {
  listId: string;
  skuId?: string;
  status?: string;
}

export interface StockListQuery extends ProductCenterPageQuery {
  skuId?: string;
  warehouseId?: string;
  status?: string;
}

export interface MovementListQuery extends ProductCenterPageQuery {
  skuId?: string;
  movementType?: string;
}

export interface ReservationListQuery extends ProductCenterPageQuery {
  skuId?: string;
  orderId?: string;
  status?: string;
}

export interface ShipmentListQuery extends ProductCenterPageQuery {
  status?: string;
  orderId?: string;
  fulfillmentId?: string;
}

/** Tracking timeline of one shipment. */
export interface TrackingEventListQuery extends ProductCenterPageQuery {
  shipmentId: string;
}

/** Carrier registry page. */
export interface CarrierListQuery extends ProductCenterPageQuery {
  status?: string;
}

/** Fulfillment page used when creating a shipment. */
export interface FulfillmentListQuery extends ProductCenterPageQuery {
  orderId?: string;
  status?: string;
}

export interface ProductCenterOverview {
  products?: number;
  categories?: number;
  skus?: number;
  stocks?: number;
  shipments?: number;
  /** Sources whose count could not be read in this cycle. */
  unavailable: readonly ProductCenterOverviewSource[];
}

export type ProductCenterOverviewSource = 'products' | 'categories' | 'skus' | 'stocks' | 'shipments';

export interface ProductCenterError {
  code?: number;
  traceId?: string;
  i18nKey?: string;
  message: string;
}

export interface ProductCenterServiceDeps {
  /** Test/consumer seam: a catalog port bound to another transport. */
  catalog?: CatalogPort;
  /** Test/consumer seam: an inventory port bound to another transport. */
  inventory?: InventoryPort;
  /** Test/consumer seam: a shipments port bound to another transport. */
  shipments?: ShipmentsPort;
  /** Test/consumer seam: a carriers port bound to another transport. */
  carriers?: CarriersPort;
  /** Test/consumer seam: a fulfillments port bound to another transport. */
  fulfillments?: FulfillmentsPort;
}

export interface ProductCenterService {
  getCatalogPort(): CatalogPort;
  getInventoryPort(): InventoryPort;
  getShipmentsPort(): ShipmentsPort;
  getCarriersPort(): CarriersPort;
  getFulfillmentsPort(): FulfillmentsPort;

  listProducts(query: ProductListQuery): Promise<ProductCenterPage<Product>>;
  createProduct(input: CreateProductRequest): Promise<Product>;
  updateProduct(productId: string, version: string, input: UpdateProductRequest): Promise<Product>;
  publishProduct(productId: string, version: string): Promise<Product>;
  archiveProduct(productId: string, version: string): Promise<Product>;

  listSkus(query: SkuListQuery): Promise<ProductCenterPage<Sku>>;
  createSku(input: CreateSkuRequest): Promise<Sku>;
  updateSku(skuId: string, version: string, input: UpdateSkuRequest): Promise<Sku>;

  listCategories(query: CategoryListQuery): Promise<ProductCenterPage<Category>>;
  createCategory(input: CreateCategoryRequest): Promise<Category>;
  updateCategory(categoryId: string, version: string, input: UpdateCategoryRequest): Promise<Category>;
  deleteCategory(categoryId: string, version: string): Promise<void>;
  deleteProduct(productId: string, version: string): Promise<void>;
  deleteSku(skuId: string, version: string): Promise<void>;
  deleteBrand(brandId: string, version: string): Promise<void>;

  listAttributes(query: AttributeListQuery): Promise<ProductCenterPage<Attribute>>;
  createAttribute(input: CreateAttributeRequest): Promise<Attribute>;
  updateAttribute(attributeId: string, version: string, input: UpdateAttributeRequest): Promise<Attribute>;

  listCategoryAttributes(query: CategoryAttributeListQuery): Promise<ProductCenterPage<CategoryAttribute>>;
  createCategoryAttribute(input: CreateCategoryAttributeRequest): Promise<CategoryAttribute>;
  updateCategoryAttribute(
    bindingId: string,
    version: string,
    input: UpdateCategoryAttributeRequest,
  ): Promise<CategoryAttribute>;
  deleteCategoryAttribute(bindingId: string, version: string): Promise<void>;

  listBrands(query: BrandListQuery): Promise<ProductCenterPage<Brand>>;
  createBrand(input: CreateBrandRequest): Promise<Brand>;
  updateBrand(brandId: string, version: string, input: UpdateBrandRequest): Promise<Brand>;

  listAttributeValues(query: AttributeValueListQuery): Promise<ProductCenterPage<AttributeValue>>;
  createAttributeValue(input: CreateAttributeValueRequest): Promise<AttributeValue>;
  updateAttributeValue(
    valueId: string,
    version: string,
    input: UpdateAttributeValueRequest,
  ): Promise<AttributeValue>;
  deleteAttributeValue(valueId: string, version: string): Promise<void>;

  retrieveProduct(productId: string): Promise<Product>;
  replaceProductAttributes(
    productId: string,
    version: string,
    attributes: readonly ProductAttributeValueInput[],
  ): Promise<ProductAttributes>;

  listMedia(query: MediaListQuery): Promise<ProductCenterPage<Media>>;
  createMedia(input: CreateMediaRequest): Promise<Media>;
  updateMedia(mediaId: string, version: string, input: UpdateMediaRequest): Promise<Media>;
  deleteMedia(mediaId: string, version: string): Promise<void>;

  listPriceLists(query: PriceListListQuery): Promise<ProductCenterPage<PriceList>>;
  createPriceList(input: CreatePriceListRequest): Promise<PriceList>;
  updatePriceList(priceListId: string, version: string, input: UpdatePriceListRequest): Promise<PriceList>;
  retrievePriceList(priceListId: string): Promise<PriceList>;
  listPriceListItems(query: PriceListItemListQuery): Promise<ProductCenterPage<PriceListItem>>;
  createPriceListItem(input: CreatePriceListItemRequest): Promise<PriceListItem>;
  updatePriceListItem(
    itemId: string,
    version: string,
    input: UpdatePriceListItemRequest,
  ): Promise<PriceListItem>;
  deletePriceListItem(itemId: string, version: string): Promise<void>;

  listStocks(query: StockListQuery): Promise<ProductCenterPage<InventoryStock>>;
  updateStock(stockId: string, input: UpdateInventoryStockRequest): Promise<InventoryStock>;
  adjustStock(stockId: string, input: AdjustInventoryStockRequest): Promise<InventoryStock>;
  listMovements(query: MovementListQuery): Promise<ProductCenterPage<InventoryMovement>>;
  listReservations(query: ReservationListQuery): Promise<ProductCenterPage<InventoryReservation>>;

  listShipments(query: ShipmentListQuery): Promise<ProductCenterPage<ShipmentSummary>>;
  retrieveShipment(shipmentId: string): Promise<ShipmentSummary>;
  listShipmentPackages(
    shipmentId: string,
    query: ProductCenterPageQuery,
  ): Promise<ProductCenterPage<ShipmentPackageSummary>>;
  createShipmentPackage(
    shipmentId: string,
    body: CreateShipmentPackageRequest,
  ): Promise<ShipmentPackageSummary>;
  updateShipmentPackage(
    shipmentId: string,
    packageId: string,
    body: UpdateShipmentPackageRequest,
  ): Promise<ShipmentPackageSummary>;

  listShipmentTrackingEvents(
    query: TrackingEventListQuery,
  ): Promise<ProductCenterPage<ShipmentTrackingEventSummary>>;
  createShipmentTrackingEvent(
    shipmentId: string,
    body: CreateShipmentTrackingEventRequest,
  ): Promise<ShipmentTrackingEventSummary>;

  listCarriers(query: CarrierListQuery): Promise<ProductCenterPage<CarrierSummary>>;
  createCarrier(body: CreateCarrierRequest): Promise<CarrierSummary>;
  updateCarrier(carrierId: string, body: UpdateCarrierRequest): Promise<CarrierSummary>;

  listFulfillments(query: FulfillmentListQuery): Promise<ProductCenterPage<FulfillmentSummary>>;
  createShipment(body: CreateShipmentRequest): Promise<ShipmentSummary>;

  loadOverview(): Promise<ProductCenterOverview>;
}

interface GeneratedPageShape<T> {
  items: T[];
  pageInfo: {
    page?: number | null;
    pageSize?: number | null;
    totalItems?: string | null;
    hasMore?: boolean | null;
  };
}

function toCount(raw: string | null | undefined): number | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizePage<T>(
  result: GeneratedPageShape<T>,
  query: ProductCenterPageQuery,
): ProductCenterPage<T> {
  const totalItems = toCount(result.pageInfo.totalItems);
  const hasNextPage = result.pageInfo.hasMore
    ?? (totalItems !== undefined
      ? query.page * query.pageSize < totalItems
      : result.items.length >= query.pageSize);
  return {
    items: result.items,
    pageInfo: {
      page: result.pageInfo.page ?? query.page,
      pageSize: result.pageInfo.pageSize ?? query.pageSize,
      ...(totalItems === undefined ? {} : { totalItems }),
      hasNextPage,
    },
  };
}

/** Drops every undefined/blank filter so a generated SDK never receives `""`. */
function compactQuery<T extends Record<string, unknown>>(query: T): T {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    next[key] = value;
  }
  return next as T;
}

/**
 * Maps a generated-SDK failure to presentation data. The generated clients
 * throw `ProblemDetail`-shaped errors (`code`, `traceId`, `i18nKey`, `message`);
 * anything else keeps a stable fallback message.
 */
export function describeProductCenterError(error: unknown): ProductCenterError {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      code?: unknown;
      traceId?: unknown;
      i18nKey?: unknown;
      message?: unknown;
      detail?: unknown;
    };
    const code = typeof candidate.code === 'number' ? candidate.code : undefined;
    const traceId = typeof candidate.traceId === 'string' && candidate.traceId ? candidate.traceId : undefined;
    const i18nKey = typeof candidate.i18nKey === 'string' && candidate.i18nKey ? candidate.i18nKey : undefined;
    const messageCandidate = typeof candidate.message === 'string'
      ? candidate.message
      : typeof candidate.detail === 'string'
        ? candidate.detail
        : undefined;
    return {
      ...(code === undefined ? {} : { code }),
      ...(traceId === undefined ? {} : { traceId }),
      ...(i18nKey === undefined ? {} : { i18nKey }),
      message: messageCandidate ?? 'Product Center request failed',
    };
  }
  return { message: 'Product Center request failed' };
}

export function createProductCenterService(
  deps: ProductCenterServiceDeps = {},
): ProductCenterService {
  const catalogPort = (): CatalogPort => deps.catalog ?? getSdkworkShopBackendSdkClient().catalog;
  const inventoryPort = (): InventoryPort => deps.inventory ?? getSdkworkInventoryBackendSdkClient().inventory;
  const shipmentsPort = (): ShipmentsPort => (
    deps.shipments ?? getSdkworkOrderBackendSdkClient().orderAdminShipments.shipments
  );
  const carriersPort = (): CarriersPort => (
    deps.carriers ?? getSdkworkOrderBackendSdkClient().orderAdminShipments.carriers
  );
  const fulfillmentsPort = (): FulfillmentsPort => (
    deps.fulfillments ?? getSdkworkOrderBackendSdkClient().orderAdminShipments.fulfillments
  );

  const countOf = async (
    loader: () => Promise<GeneratedPageShape<unknown>>,
  ): Promise<number | undefined> => {
    try {
      const page = await loader();
      return toCount(page.pageInfo.totalItems) ?? page.items.length;
    } catch {
      return undefined;
    }
  };

  return {
    getCatalogPort: catalogPort,
    getInventoryPort: inventoryPort,
    getShipmentsPort: shipmentsPort,
    getCarriersPort: carriersPort,
    getFulfillmentsPort: fulfillmentsPort,

    async listProducts(query) {
      const result = await catalogPort().products.management.list(compactQuery({
        q: query.q,
        categoryId: query.categoryId,
        brandId: query.brandId,
        productType: query.productType,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    createProduct(input) {
      return catalogPort().products.create(input);
    },

    updateProduct(productId, version, input) {
      return catalogPort().products.update(productId, { ifMatch: version }, input);
    },

    publishProduct(productId, version) {
      return catalogPort().products.publish(productId, { ifMatch: version });
    },

    archiveProduct(productId, version) {
      return catalogPort().products.archive(productId, { ifMatch: version });
    },

    async listSkus(query) {
      const result = await catalogPort().skus.list(compactQuery({
        productId: query.productId,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    createSku(input) {
      return catalogPort().skus.create(input);
    },

    updateSku(skuId, version, input) {
      return catalogPort().skus.update(skuId, { ifMatch: version }, input);
    },

    async listCategories(query) {
      const result = await catalogPort().categories.management.list(compactQuery({
        parentId: query.parentId,
        ...(query.rootOnly ? { rootOnly: true } : {}),
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    createCategory(input) {
      return catalogPort().categories.create(input);
    },

    updateCategory(categoryId, version, input) {
      return catalogPort().categories.update(categoryId, { ifMatch: version }, input);
    },

    async deleteCategory(categoryId, version) {
      await catalogPort().categories.delete(categoryId, { ifMatch: version });
    },

    async deleteProduct(productId, version) {
      await catalogPort().products.delete(productId, { ifMatch: version });
    },

    async deleteSku(skuId, version) {
      await catalogPort().skus.delete(skuId, { ifMatch: version });
    },

    async deleteBrand(brandId, version) {
      await catalogPort().brands.delete(brandId, { ifMatch: version });
    },

    async listAttributes(query) {
      const result = await catalogPort().attributes.management.list(compactQuery({
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    createAttribute(input) {
      return catalogPort().attributes.create(input);
    },

    updateAttribute(attributeId, version, input) {
      return catalogPort().attributes.update(attributeId, { ifMatch: version }, input);
    },

    async listCategoryAttributes(query) {
      const result = await catalogPort().categoryAttributes.list(compactQuery({
        categoryId: query.categoryId,
        attributeId: query.attributeId,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    createCategoryAttribute(input) {
      return catalogPort().categoryAttributes.create(input);
    },

    updateCategoryAttribute(bindingId, version, input) {
      return catalogPort().categoryAttributes.update(bindingId, { ifMatch: version }, input);
    },

    async deleteCategoryAttribute(bindingId, version) {
      await catalogPort().categoryAttributes.delete(bindingId, { ifMatch: version });
    },

    async listBrands(query) {
      const result = await catalogPort().brands.list(compactQuery({
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    createBrand(input) {
      return catalogPort().brands.create(input);
    },

    updateBrand(brandId, version, input) {
      return catalogPort().brands.update(brandId, { ifMatch: version }, input);
    },

    async listAttributeValues(query) {
      const result = await catalogPort().attributeValues.list(compactQuery({
        attributeId: query.attributeId,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    createAttributeValue(input) {
      return catalogPort().attributeValues.create(input);
    },

    updateAttributeValue(valueId, version, input) {
      return catalogPort().attributeValues.update(valueId, { ifMatch: version }, input);
    },

    async deleteAttributeValue(valueId, version) {
      await catalogPort().attributeValues.delete(valueId, { ifMatch: version });
    },

    retrieveProduct(productId) {
      return catalogPort().products.management.retrieve(productId);
    },

    replaceProductAttributes(productId, version, attributes) {
      return catalogPort().products.attributes.update(
        productId,
        { attributes: [...attributes] },
        { ifMatch: version },
      );
    },

    async listMedia(query) {
      const result = await catalogPort().media.list(compactQuery({
        ownerType: query.ownerType,
        ownerId: query.ownerId,
        mediaRole: query.mediaRole,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    createMedia(input) {
      return catalogPort().media.create(input);
    },

    updateMedia(mediaId, version, input) {
      return catalogPort().media.update(mediaId, input, { ifMatch: version });
    },

    async deleteMedia(mediaId, version) {
      await catalogPort().media.delete(mediaId, { ifMatch: version });
    },

    async listPriceLists(query) {
      const result = await catalogPort().priceLists.list(compactQuery({
        status: query.status,
        currencyCode: query.currencyCode,
        marketCode: query.marketCode,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    createPriceList(input) {
      return catalogPort().priceLists.create(input);
    },

    updatePriceList(priceListId, version, input) {
      return catalogPort().priceLists.update(priceListId, { ifMatch: version }, input);
    },

    retrievePriceList(priceListId) {
      return catalogPort().priceLists.retrieve(priceListId);
    },

    async listPriceListItems(query) {
      const result = await catalogPort().priceListItems.list(compactQuery({
        listId: query.listId,
        skuId: query.skuId,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    createPriceListItem(input) {
      return catalogPort().priceListItems.create(input);
    },

    updatePriceListItem(itemId, version, input) {
      return catalogPort().priceListItems.update(itemId, input, { ifMatch: version });
    },

    async deletePriceListItem(itemId, version) {
      await catalogPort().priceListItems.delete(itemId, { ifMatch: version });
    },

    async listStocks(query) {
      const result = await inventoryPort().stocks.list(compactQuery({
        skuId: query.skuId,
        warehouseId: query.warehouseId,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    updateStock(stockId, input) {
      return inventoryPort().stocks.update(stockId, input);
    },

    /**
     * Records an inbound / outbound / stocktake adjustment.
     *
     * The owning backend writes the movement ledger row and the new quantity in
     * one transaction, so the Product Center never patches an absolute quantity
     * that could overwrite a concurrent movement.
     */
    adjustStock(stockId, input) {
      return inventoryPort().stocks.adjustments.create(
        stockId,
        input,
        createIdempotencyParams('product-center-stock-adjustment'),
      );
    },

    async listMovements(query) {
      const result = await inventoryPort().movements.list(compactQuery({
        skuId: query.skuId,
        movementType: query.movementType,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    async listReservations(query) {
      const result = await inventoryPort().reservations.list(compactQuery({
        skuId: query.skuId,
        orderId: query.orderId,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      }));
      return normalizePage(result, query);
    },

    async listShipments(query) {
      const result = await shipmentsPort().list(compactQuery({
        status: query.status,
        orderId: query.orderId,
        fulfillmentId: query.fulfillmentId,
        page: String(query.page),
        pageSize: String(query.pageSize),
      }));
      return normalizePage(result, query);
    },

    retrieveShipment(shipmentId) {
      return shipmentsPort().retrieve(shipmentId);
    },

    async listShipmentPackages(shipmentId, query) {
      const result = await shipmentsPort().packages.management.list(shipmentId, {
        page: String(query.page),
        pageSize: String(query.pageSize),
      });
      return normalizePage(result, query);
    },

    createShipmentPackage(shipmentId, body) {
      return shipmentsPort().packages.create(
        shipmentId,
        body,
        createIdempotencyParams('product-center-shipment-package'),
      );
    },

    updateShipmentPackage(shipmentId, packageId, body) {
      return shipmentsPort().packages.update(
        shipmentId,
        packageId,
        body,
        createIdempotencyParams('product-center-shipment-package'),
      );
    },

    async listShipmentTrackingEvents(query) {
      const result = await shipmentsPort().trackingEvents.management.list(query.shipmentId, {
        page: String(query.page),
        pageSize: String(query.pageSize),
      });
      return normalizePage(result, query);
    },

    createShipmentTrackingEvent(shipmentId, body) {
      return shipmentsPort().trackingEvents.create(
        shipmentId,
        body,
        createIdempotencyParams('product-center-shipment-tracking-event'),
      );
    },

    async listCarriers(query) {
      const result = await carriersPort().list(compactQuery({
        status: query.status,
        page: String(query.page),
        pageSize: String(query.pageSize),
      }));
      return normalizePage(result, query);
    },

    createCarrier(body) {
      return carriersPort().create(
        body,
        createIdempotencyParams('product-center-carrier'),
      );
    },

    updateCarrier(carrierId, body) {
      return carriersPort().update(
        carrierId,
        body,
        createIdempotencyParams('product-center-carrier-update'),
      );
    },

    async listFulfillments(query) {
      const result = await fulfillmentsPort().management.list(compactQuery({
        orderId: query.orderId,
        status: query.status,
        page: String(query.page),
        pageSize: String(query.pageSize),
      }));
      return normalizePage(result, query);
    },

    createShipment(body) {
      return shipmentsPort().create(
        body,
        createIdempotencyParams('product-center-shipment'),
      );
    },

    async loadOverview() {
      const [products, categories, skus, stocks, shipments] = await Promise.all([
        countOf(() => catalogPort().products.management.list({ page: 1, pageSize: 1 })),
        countOf(() => catalogPort().categories.management.list({ page: 1, pageSize: 1 })),
        countOf(() => catalogPort().skus.list({ page: 1, pageSize: 1 })),
        countOf(() => inventoryPort().stocks.list({ page: 1, pageSize: 1 })),
        countOf(() => shipmentsPort().list({ page: '1', pageSize: '1' })),
      ]);
      const overview: ProductCenterOverview = { unavailable: [] };
      const sources: Array<[ProductCenterOverviewSource, number | undefined]> = [
        ['products', products],
        ['categories', categories],
        ['skus', skus],
        ['stocks', stocks],
        ['shipments', shipments],
      ];
      const unavailable: ProductCenterOverviewSource[] = [];
      for (const [source, count] of sources) {
        if (count === undefined) {
          unavailable.push(source);
          continue;
        }
        overview[source] = count;
      }
      return { ...overview, unavailable };
    },
  };
}

let productCenterService: ProductCenterService | null = null;

/** Shared Product Center service bound to the portal's dependency SDK clients. */
export function getProductCenterService(): ProductCenterService {
  if (!productCenterService) {
    productCenterService = createProductCenterService();
  }
  return productCenterService;
}
