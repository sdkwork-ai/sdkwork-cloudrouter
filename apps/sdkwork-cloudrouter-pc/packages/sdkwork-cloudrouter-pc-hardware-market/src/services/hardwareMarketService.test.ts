import { describe, expect, it, vi } from 'vitest';

import type {
  CatalogCategory,
  CatalogPageInfo,
  CatalogProduct,
  CatalogSku,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

import {
  loadHardwareMarketCategories,
  loadHardwareMarketProduct,
  loadHardwareMarketProducts,
  type HardwareMarketCatalogPort,
  type HardwareMarketProductQueryParams,
  type HardwareMarketRequestOptions,
} from './hardwareMarketService.ts';

function pageInfo(hasMore: boolean, page = 1): CatalogPageInfo {
  return {
    mode: 'offset',
    page,
    pageSize: 200,
    totalItems: '1',
    totalPages: hasMore ? page + 1 : page,
    hasMore,
  };
}

function createProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 'p-a',
    productNo: 'P-A',
    categoryId: 'cat-1',
    name: 'Camera',
    title: 'Camera Pro',
    productType: 'physical',
    status: 'active',
    salesStatus: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    version: '1',
    ...overrides,
  };
}

function createSku(overrides: Partial<CatalogSku> = {}): CatalogSku {
  return {
    id: 'sku-a',
    productId: 'p-a',
    skuNo: 'SKU-A',
    variantSignature: 'color=black',
    currencyCode: 'CNY',
    minorUnitExponent: '2',
    salePriceMinor: '19900',
    fulfillmentType: 'physical',
    inventoryTracking: 'quantity',
    status: 'active',
    salesStatus: 'active',
    attributeValues: [],
    version: '1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createCategory(overrides: Partial<CatalogCategory> = {}): CatalogCategory {
  return {
    id: 'cat-1',
    categoryNo: 'CAT-1',
    parentId: null,
    path: '/cat-1',
    depth: '0',
    isLeaf: false,
    name: 'Cameras',
    sortOrder: '0',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    version: '1',
    ...overrides,
  };
}

function createPort(overrides: Partial<HardwareMarketCatalogPort> = {}): HardwareMarketCatalogPort {
  return {
    categories: {
      list: async () => ({ items: [], pageInfo: pageInfo(false) }),
    },
    products: {
      list: async () => ({ items: [], pageInfo: pageInfo(false) }),
      retrieve: async () => createProduct(),
      skus: {
        list: async () => ({ items: [], pageInfo: pageInfo(false) }),
      },
    },
    ...overrides,
  };
}

describe('loadHardwareMarketProducts', () => {
  it('queries only physical products and maps the cheapest sellable SKU price', async () => {
    const list = vi.fn(async (
      _params?: HardwareMarketProductQueryParams,
      _options?: HardwareMarketRequestOptions,
    ) => ({
      items: [createProduct({ id: 'p-a' }), createProduct({ id: 'p-b', productNo: 'P-B' })],
      pageInfo: { ...pageInfo(true), pageSize: 12 },
    }));
    const skusList = vi.fn(async (productId: string) => {
      if (productId === 'p-b') {
        throw new Error('catalog unavailable');
      }
      return {
        items: [
          createSku({ id: 'sku-1', salePriceMinor: '19900' }),
          createSku({ id: 'sku-2', salePriceMinor: '9900' }),
          createSku({ id: 'sku-3', status: 'draft', salePriceMinor: '100' }),
        ],
        pageInfo: pageInfo(false),
      };
    });
    const port = createPort({
      products: {
        list,
        retrieve: async () => createProduct(),
        skus: { list: skusList },
      },
    });

    const result = await loadHardwareMarketProducts(
      { q: '  router ', categoryId: 'cat-1', sort: 'price-asc' },
      2,
      {},
      port,
    );

    expect(list.mock.calls[0]?.[0]).toEqual({
      q: 'router',
      categoryId: 'cat-1',
      productType: 'physical',
      sort: 'price-asc',
      page: 2,
      pageSize: 12,
    });
    expect(result.items[0]?.price?.amountMinor).toBe('9900');
    expect(result.items[0]?.skuCount).toBe(2);
    expect(result.items[1]?.price).toBeNull();
    expect(result.items[1]?.skuCount).toBe(0);
  });

  it('propagates an aborted request instead of rendering a half page', async () => {
    const port = createPort({
      products: {
        list: async () => ({
          items: [createProduct()],
          pageInfo: { ...pageInfo(false), pageSize: 12 },
        }),
        retrieve: async () => createProduct(),
        skus: { list: async () => ({ items: [createSku()], pageInfo: pageInfo(false) }) },
      },
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      loadHardwareMarketProducts({ q: '', categoryId: null, sort: 'newest' }, 1, { signal: controller.signal }, port),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('loadHardwareMarketCategories', () => {
  it('consumes every category page before building the tree', async () => {
    const list = vi.fn(async (params?: { page?: number }) => {
      if (params?.page === 1) {
        return { items: [createCategory({ id: 'root' })], pageInfo: pageInfo(true, 1) };
      }
      return {
        items: [createCategory({ id: 'child', parentId: 'root', depth: '1', sortOrder: '1' })],
        pageInfo: pageInfo(false, 2),
      };
    });
    const port = createPort({ categories: { list } });

    const tree = await loadHardwareMarketCategories({}, port);

    expect(list).toHaveBeenCalledTimes(2);
    expect(tree[0]?.id).toBe('root');
    expect(tree[0]?.children[0]?.id).toBe('child');
  });
});

describe('loadHardwareMarketProduct', () => {
  it('loads the product and its SKUs together', async () => {
    const retrieve = vi.fn(async () => createProduct());
    const skusList = vi.fn(async () => ({ items: [createSku()], pageInfo: pageInfo(false) }));
    const port = createPort({
      products: {
        list: async () => ({ items: [], pageInfo: pageInfo(false) }),
        retrieve,
        skus: { list: skusList },
      },
    });

    const detail = await loadHardwareMarketProduct('p-a', {}, port);

    expect(detail.product.id).toBe('p-a');
    expect(detail.skus).toHaveLength(1);
    expect(retrieve).toHaveBeenCalledWith('p-a', {});
    expect(skusList).toHaveBeenCalledWith('p-a', { page: 1, pageSize: 200 }, {});
  });
});
