import {
  getSdkworkCatalogAppSdkClient,
  type CatalogCategory,
  type CatalogCategoryPageData,
  type CatalogPageInfo,
  type CatalogProduct,
  type CatalogProductPageData,
  type CatalogSku,
  type CatalogSkuPageData,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

import {
  HARDWARE_MARKET_CATEGORY_PAGE_SIZE,
  HARDWARE_MARKET_MAX_CATEGORY_PAGES,
  HARDWARE_MARKET_MAX_PAGE_SIZE,
  HARDWARE_MARKET_PAGE_SIZE,
  HARDWARE_MARKET_SKU_FETCH_CONCURRENCY,
  HARDWARE_MARKET_SKU_PAGE_SIZE,
  buildCategoryTree,
  isSellableSku,
  marketSortParam,
  resolveMarketPrice,
  type MarketCategoryNode,
  type MarketPrice,
  type MarketSort,
} from '../catalog/hardwareMarketCatalog.ts';

/**
 * Product Center transport for the Smart Hardware Market.
 *
 * The storefront reads the buyer-facing catalog through the generated
 * `@sdkwork/catalog-app-sdk` port exposed by the shared commons client. It never
 * touches the management surface (product center admin) and never issues raw
 * HTTP: the generated client owns paths, auth projection, and the response
 * envelope.
 *
 * `sort` is forwarded as-is because the catalog backend owns the whitelist
 * (`price-asc` / `price-desc`; anything else falls back to newest).
 */

export interface HardwareMarketRequestOptions {
  signal?: AbortSignal;
}

export interface HardwareMarketProductQueryParams {
  q?: string;
  categoryId?: string;
  productType?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Structural port over the generated catalog client. Narrowing it to the four
 * reads the storefront needs lets a test bind a stub without constructing an
 * SDK transport.
 */
export interface HardwareMarketCatalogPort {
  categories: {
    list(
      params?: { page?: number; pageSize?: number },
      options?: HardwareMarketRequestOptions,
    ): Promise<CatalogCategoryPageData>;
  };
  products: {
    list(
      params?: HardwareMarketProductQueryParams,
      options?: HardwareMarketRequestOptions,
    ): Promise<CatalogProductPageData>;
    retrieve(productId: string, options?: HardwareMarketRequestOptions): Promise<CatalogProduct>;
    skus: {
      list(
        productId: string,
        params?: { page?: number; pageSize?: number },
        options?: HardwareMarketRequestOptions,
      ): Promise<CatalogSkuPageData>;
    };
  };
}

export function resolveHardwareMarketCatalogPort(): HardwareMarketCatalogPort {
  return getSdkworkCatalogAppSdkClient().catalog;
}

export interface HardwareMarketQuery {
  q: string;
  categoryId: string | null;
  sort: MarketSort;
}

export interface HardwareMarketProductSummary {
  product: CatalogProduct;
  price: MarketPrice | null;
  skuCount: number;
}

export interface HardwareMarketProductPage {
  items: HardwareMarketProductSummary[];
  pageInfo: CatalogPageInfo;
}

export interface HardwareMarketProductDetail {
  product: CatalogProduct;
  skus: CatalogSku[];
}

export function isHardwareMarketAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function abortError(): Error {
  const error = new Error('The Smart Hardware Market request was aborted.');
  error.name = 'AbortError';
  return error;
}

async function mapWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  limit: number,
  worker: (item: TItem, index: number) => Promise<TResult>,
  signal?: AbortSignal,
): Promise<TResult[]> {
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;
  const concurrency = Math.max(1, Math.min(limit, items.length));

  const run = async (): Promise<void> => {
    for (;;) {
      if (signal?.aborted) {
        throw abortError();
      }
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index] as TItem, index);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => run()));
  return results;
}

async function loadProductSkus(
  productId: string,
  options: HardwareMarketRequestOptions,
  port: HardwareMarketCatalogPort,
): Promise<CatalogSku[]> {
  try {
    const page = await port.products.skus.list(
      productId,
      { page: 1, pageSize: HARDWARE_MARKET_SKU_PAGE_SIZE },
      options,
    );
    return page.items;
  } catch (error) {
    // One product without a readable SKU page must not blank the whole grid:
    // the card renders "price on request" instead. An aborted request still
    // propagates so the page can stop updating after unmount.
    if (isHardwareMarketAbort(error) || options.signal?.aborted) {
      throw error;
    }
    return [];
  }
}

/**
 * Loads the full category tree. The buyer-facing rail is a tree, and the route
 * pages each category, so partial pages would hide parent nodes.
 */
export async function loadHardwareMarketCategories(
  options: HardwareMarketRequestOptions = {},
  port: HardwareMarketCatalogPort = resolveHardwareMarketCatalogPort(),
): Promise<MarketCategoryNode[]> {
  const collected: CatalogCategory[] = [];
  for (let page = 1; page <= HARDWARE_MARKET_MAX_CATEGORY_PAGES; page += 1) {
    const response = await port.categories.list(
      { page, pageSize: HARDWARE_MARKET_CATEGORY_PAGE_SIZE },
      options,
    );
    collected.push(...response.items);
    if (!response.pageInfo.hasMore) {
      break;
    }
  }
  return buildCategoryTree(collected);
}

export async function loadHardwareMarketProducts(
  query: HardwareMarketQuery,
  page: number,
  options: HardwareMarketRequestOptions = {},
  port: HardwareMarketCatalogPort = resolveHardwareMarketCatalogPort(),
): Promise<HardwareMarketProductPage> {
  const sort = marketSortParam(query.sort);
  const response = await port.products.list(
    {
      ...(query.q.trim() ? { q: query.q.trim() } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      // The market is the physical-hardware storefront; digital, service,
      // membership, and points products belong to their own surfaces.
      productType: 'physical',
      ...(sort ? { sort } : {}),
      page: Math.max(1, Math.trunc(page)),
      pageSize: Math.min(HARDWARE_MARKET_PAGE_SIZE, HARDWARE_MARKET_MAX_PAGE_SIZE),
    },
    options,
  );

  const items = await mapWithConcurrency(
    response.items,
    HARDWARE_MARKET_SKU_FETCH_CONCURRENCY,
    async (product) => {
      const skus = await loadProductSkus(product.id, options, port);
      return {
        product,
        price: resolveMarketPrice(skus),
        skuCount: skus.filter(isSellableSku).length,
      };
    },
    options.signal,
  );

  return { items, pageInfo: response.pageInfo };
}

export async function loadHardwareMarketProduct(
  productId: string,
  options: HardwareMarketRequestOptions = {},
  port: HardwareMarketCatalogPort = resolveHardwareMarketCatalogPort(),
): Promise<HardwareMarketProductDetail> {
  const [product, skuPage] = await Promise.all([
    port.products.retrieve(productId, options),
    port.products.skus.list(productId, { page: 1, pageSize: HARDWARE_MARKET_SKU_PAGE_SIZE }, options),
  ]);
  return { product, skus: skuPage.items };
}
