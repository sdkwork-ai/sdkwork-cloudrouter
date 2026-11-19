import { describe, expect, it } from 'vitest';

import type { CatalogCategory, CatalogSku } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import {
  EMPTY_SHIPPING_ADDRESS,
  buildCategoryTree,
  clampQuantity,
  createCheckoutAttemptKey,
  describeSkuLabel,
  findCategory,
  flattenCategoryNodes,
  formatMarketAmount,
  formatMarketDate,
  isMarketSort,
  isSellableSku,
  marketSortParam,
  productDisplayName,
  productTagline,
  resolveCategoryTrail,
  resolveDiscountPercent,
  resolveHardwareGlyphKind,
  resolveMarketPrice,
  resolveShippingAddressErrors,
  sortSkusForDisplay,
  toPhysicalShippingAddress,
} from './hardwareMarketCatalog.ts';

function createSku(overrides: Partial<CatalogSku> = {}): CatalogSku {
  return {
    id: 'sku-1',
    productId: 'product-1',
    skuNo: 'SKU-001',
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
    isLeaf: true,
    name: 'Cameras',
    sortOrder: '0',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    version: '1',
    ...overrides,
  };
}

describe('pricing', () => {
  it('picks the cheapest sellable SKU and keeps wire amounts as strings', () => {
    const price = resolveMarketPrice([
      createSku({ id: 'a', salePriceMinor: '19900', listPriceMinor: '29900' }),
      createSku({ id: 'b', salePriceMinor: '9900' }),
      createSku({ id: 'c', salePriceMinor: '5000', salesStatus: 'inactive' }),
      createSku({ id: 'd', salePriceMinor: '1', status: 'draft' }),
    ]);

    expect(price).toEqual({
      amountMinor: '9900',
      currencyCode: 'CNY',
      exponent: '2',
      listAmountMinor: null,
    });
  });

  it('never compares amounts across currencies', () => {
    const price = resolveMarketPrice([
      createSku({ id: 'usd', currencyCode: 'USD', salePriceMinor: '5000' }),
      createSku({ id: 'cny', currencyCode: 'CNY', salePriceMinor: '100' }),
    ]);

    expect(price?.currencyCode).toBe('USD');
    expect(price?.amountMinor).toBe('5000');
  });

  it('ignores a list price that is not above the sale price', () => {
    const price = resolveMarketPrice([createSku({ salePriceMinor: '9900', listPriceMinor: '9900' })]);
    expect(price?.listAmountMinor).toBeNull();
  });

  it('reports no price when nothing is sellable', () => {
    expect(resolveMarketPrice([createSku({ status: 'draft' })])).toBeNull();
  });

  it('formats minor units for exponents 0, 2, and 3', () => {
    expect(formatMarketAmount('19900', 'CNY', '2', 'en-US')).toContain('199.00');
    expect(formatMarketAmount('199', 'JPY', '0', 'en-US')).toContain('199');
    expect(formatMarketAmount('1234', 'KWD', '3', 'en-US')).toContain('1.234');
  });

  it('falls back to a decimal string when a minor amount exceeds the safe integer range', () => {
    const formatted = formatMarketAmount('92233720368547758', 'CNY', '2', 'en-US');
    expect(formatted).toBe('CNY 922337203685477.58');
  });

  it('computes a discount percent only for a real markdown', () => {
    expect(resolveDiscountPercent({
      amountMinor: '8000',
      currencyCode: 'CNY',
      exponent: '2',
      listAmountMinor: '10000',
    })).toBe(20);
    expect(resolveDiscountPercent({
      amountMinor: '10000',
      currencyCode: 'CNY',
      exponent: '2',
      listAmountMinor: null,
    })).toBeNull();
  });
});

describe('sort parameters', () => {
  it('sends no sort token for newest because the backend defaults to created_at DESC', () => {
    expect(marketSortParam('newest')).toBeUndefined();
    expect(marketSortParam('price-asc')).toBe('price-asc');
    expect(marketSortParam('price-desc')).toBe('price-desc');
  });

  it('only accepts the three storefront sorts', () => {
    expect(isMarketSort('price-asc')).toBe(true);
    expect(isMarketSort('popular')).toBe(false);
    expect(isMarketSort(null)).toBe(false);
  });
});

describe('category tree', () => {
  const categories: CatalogCategory[] = [
    createCategory({ id: 'root-b', name: 'Sensors', sortOrder: '2', depth: '0', isLeaf: false }),
    createCategory({ id: 'root-a', name: 'Cameras', sortOrder: '1', depth: '0', isLeaf: false }),
    createCategory({ id: 'child-b', name: 'Indoor', parentId: 'root-a', depth: '1', sortOrder: '2' }),
    createCategory({ id: 'child-a', name: 'Outdoor', parentId: 'root-a', depth: '1', sortOrder: '1' }),
    createCategory({ id: 'grandchild', name: '4K', parentId: 'child-a', depth: '2', sortOrder: '1' }),
  ];

  it('nests children and orders every level by sortOrder', () => {
    const tree = buildCategoryTree(categories);
    expect(tree.map((node) => node.id)).toEqual(['root-a', 'root-b']);
    expect(tree[0]?.children.map((node) => node.id)).toEqual(['child-a', 'child-b']);
    expect(tree[0]?.children[0]?.children.map((node) => node.id)).toEqual(['grandchild']);
  });

  it('flattens depth-first and resolves a trail', () => {
    const tree = buildCategoryTree(categories);
    expect(flattenCategoryNodes(tree).map((node) => node.id)).toEqual([
      'root-a',
      'child-a',
      'grandchild',
      'child-b',
      'root-b',
    ]);
    expect(resolveCategoryTrail(tree, 'grandchild').map((node) => node.id)).toEqual([
      'root-a',
      'child-a',
      'grandchild',
    ]);
    expect(findCategory(tree, 'child-b')?.name).toBe('Indoor');
    expect(resolveCategoryTrail(tree, null)).toEqual([]);
  });
});

describe('product copy and glyphs', () => {
  it('maps hardware keywords to specification glyphs', () => {
    expect(resolveHardwareGlyphKind('4K 智能摄像头', '安防')).toBe('camera');
    expect(resolveHardwareGlyphKind('Whole-home Mesh Router', 'Network')).toBe('router');
    expect(resolveHardwareGlyphKind('温湿度传感器', null)).toBe('sensor');
    expect(resolveHardwareGlyphKind('Mystery Box', null)).toBe('chip');
  });

  it('prefers the marketing title and subtitle for display', () => {
    const product = {
      id: 'p1',
      productNo: 'P-1',
      categoryId: 'c1',
      name: 'Router',
      title: 'Router Pro',
      subtitle: 'Wi-Fi 7 mesh node',
      productType: 'physical',
      status: 'active',
      salesStatus: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      version: '1',
    } as const;
    expect(productDisplayName(product)).toBe('Router Pro');
    expect(productTagline(product)).toBe('Wi-Fi 7 mesh node');
  });

  it('describes a SKU from its variant values, then its title, then its number', () => {
    expect(describeSkuLabel(createSku({
      attributeValues: [
        { attributeId: 'a', attributeValueId: 'v1', attributeNo: 'color', valueCode: 'black', displayValue: 'Black' },
        { attributeId: 'b', attributeValueId: 'v2', attributeNo: 'storage', valueCode: '256', displayValue: '256 GB' },
      ],
    }))).toBe('Black / 256 GB');
    expect(describeSkuLabel(createSku({ title: 'Pro Max' }))).toBe('Pro Max');
    expect(describeSkuLabel(createSku())).toBe('SKU-001');
  });

  it('sorts sellable SKUs first and by price', () => {
    const sorted = sortSkusForDisplay([
      createSku({ id: 'draft', status: 'draft', salePriceMinor: '100' }),
      createSku({ id: 'pricey', salePriceMinor: '30000' }),
      createSku({ id: 'cheap', salePriceMinor: '10000' }),
    ]);
    expect(sorted.map((sku) => sku.id)).toEqual(['cheap', 'pricey', 'draft']);
    expect(isSellableSku(sorted[2] as CatalogSku)).toBe(false);
  });
});

describe('shipping address', () => {
  it('reports every required field that is empty', () => {
    const missing = resolveShippingAddressErrors(EMPTY_SHIPPING_ADDRESS);
    expect(missing).toEqual([
      'receiverName',
      'receiverPhone',
      'province',
      'city',
      'detailAddress',
    ]);
  });

  it('trims values and omits optional empties', () => {
    const address = toPhysicalShippingAddress({
      receiverName: ' Ada ',
      receiverPhone: ' 13800000000 ',
      countryCode: 'cn',
      province: ' Zhejiang ',
      city: ' Hangzhou ',
      district: ' ',
      detailAddress: ' 1 West Lake Road ',
      postalCode: '310000',
    });
    expect(address).toEqual({
      receiverName: 'Ada',
      receiverPhone: '13800000000',
      countryCode: 'CN',
      province: 'Zhejiang',
      city: 'Hangzhou',
      detailAddress: '1 West Lake Road',
      postalCode: '310000',
    });
    expect('district' in address).toBe(false);
  });

  it('clamps quantities and mints an attempt key', () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(1000)).toBe(99);
    expect(clampQuantity(Number.NaN)).toBe(1);
    expect(createCheckoutAttemptKey().length).toBeGreaterThan(8);
  });
});

describe('date formatting', () => {
  it('formats ISO dates and rejects junk', () => {
    expect(formatMarketDate('2026-01-02T03:04:05Z', 'en-US')).toMatch(/2026/u);
    expect(formatMarketDate('not-a-date', 'en-US')).toBeNull();
    expect(formatMarketDate(null, 'en-US')).toBeNull();
  });
});
