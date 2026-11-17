import { describe, expect, it } from 'vitest';

import {
  PRODUCT_CENTER_ADMIN_DEFAULT_PATH,
  PRODUCT_CENTER_ADMIN_MENU,
  PRODUCT_CENTER_ADMIN_MODULE_DEF,
  PRODUCT_CENTER_ADMIN_PERMISSION_HINTS,
  PRODUCT_CENTER_ADMIN_ROUTE_PREFIX,
  PRODUCT_CENTER_ADMIN_ROUTE_RECORDS,
  PRODUCT_CENTER_ADMIN_SCREENS,
} from './contribution.ts';
import { productCenterAdminMessages } from './i18n/index.ts';

describe('Product Center admin contribution', () => {
  it('registers one header module under /admin/products', () => {
    expect(PRODUCT_CENTER_ADMIN_MODULE_DEF.id).toBe('productCenter');
    expect(PRODUCT_CENTER_ADMIN_MODULE_DEF.nameKey).toBe('admin.header.productCenter');
    expect(PRODUCT_CENTER_ADMIN_MODULE_DEF.defaultPath).toBe(PRODUCT_CENTER_ADMIN_DEFAULT_PATH);
    expect(PRODUCT_CENTER_ADMIN_MODULE_DEF.pathPrefixes).toEqual([PRODUCT_CENTER_ADMIN_ROUTE_PREFIX]);
    expect(PRODUCT_CENTER_ADMIN_ROUTE_PREFIX).toBe('/admin/products');
  });

  it('covers the industry-standard commerce chain in the sidebar', () => {
    const groupKeys = PRODUCT_CENTER_ADMIN_MENU.groups.map((group) => group.groupKey);
    expect(groupKeys).toEqual([
      'admin.menu.productCenter.catalogGroup',
      'admin.menu.productCenter.taxonomyGroup',
      'admin.menu.productCenter.pricingGroup',
      'admin.menu.productCenter.inventoryGroup',
      'admin.menu.productCenter.fulfillmentGroup',
    ]);

    const menuPaths = [
      ...(PRODUCT_CENTER_ADMIN_MENU.items ?? []).map((item) => item.path),
      ...PRODUCT_CENTER_ADMIN_MENU.groups.flatMap((group) => group.items.map((item) => item.path)),
    ];
    expect(new Set(menuPaths).size).toBe(menuPaths.length);
    for (const path of menuPaths) {
      expect(path.startsWith(`${PRODUCT_CENTER_ADMIN_ROUTE_PREFIX}/`) || path === PRODUCT_CENTER_ADMIN_ROUTE_PREFIX)
        .toBe(true);
    }
    for (const requiredPath of [
      '/admin/products',
      '/admin/products/list',
      '/admin/products/skus',
      '/admin/products/brands',
      '/admin/products/categories',
      '/admin/products/category-tree',
      '/admin/products/attributes',
      '/admin/products/pricing',
      '/admin/products/inventory',
      '/admin/products/inventory/movements',
      '/admin/products/inventory/reservations',
      '/admin/products/shipments',
      '/admin/products/logistics',
      '/admin/products/carriers',
    ]) {
      expect(menuPaths).toContain(requiredPath);
    }
  });

  it('maps every menu path to exactly one route record', () => {
    const recordPaths = PRODUCT_CENTER_ADMIN_ROUTE_RECORDS.map((record) => record.path);
    expect(new Set(recordPaths).size).toBe(recordPaths.length);

    const menuPaths = [
      ...(PRODUCT_CENTER_ADMIN_MENU.items ?? []).map((item) => item.path),
      ...PRODUCT_CENTER_ADMIN_MENU.groups.flatMap((group) => group.items.map((item) => item.path)),
    ];
    const expectedRecords = menuPaths.map((path) => (
      path === PRODUCT_CENTER_ADMIN_ROUTE_PREFIX
        ? 'products'
        : path.replace(`${PRODUCT_CENTER_ADMIN_ROUTE_PREFIX}/`, 'products/')
    ));
    for (const recordPath of expectedRecords) {
      expect(recordPaths).toContain(recordPath);
    }

    for (const record of PRODUCT_CENTER_ADMIN_ROUTE_RECORDS) {
      expect(record.requiredPermission).toBe('cloudrouter.admin.access');
      expect(PRODUCT_CENTER_ADMIN_SCREENS).toContain(record.screen);
    }
  });

  it('exposes exactly one screen per operator surface', () => {
    expect([...PRODUCT_CENTER_ADMIN_SCREENS].sort()).toEqual([
      'attributes',
      'brands',
      'carriers',
      'categories',
      'category-tree',
      'logistics',
      'movements',
      'overview',
      'price-lists',
      'product-detail',
      'products',
      'reservations',
      'shipments',
      'skus',
      'stocks',
    ]);
  });

  it('guards the whole route prefix with the admin permission', () => {
    expect(PRODUCT_CENTER_ADMIN_PERMISSION_HINTS).toEqual([
      { pathPrefix: '/admin/products', requiredPermission: 'cloudrouter.admin.access' },
    ]);
  });

  it('ships en/zh copy for every header, menu, and screen title', () => {
    const menuKeys = [
      PRODUCT_CENTER_ADMIN_MODULE_DEF.nameKey,
      ...(PRODUCT_CENTER_ADMIN_MENU.items ?? []).map((item) => item.labelKey),
      ...PRODUCT_CENTER_ADMIN_MENU.groups.flatMap((group) => [
        group.groupKey,
        ...group.items.map((item) => item.labelKey),
      ]),
    ];
    for (const key of menuKeys) {
      expect(productCenterAdminMessages.en[key], `missing en key ${key}`).toBeTruthy();
      expect(productCenterAdminMessages.zh[key], `missing zh key ${key}`).toBeTruthy();
    }
    for (const screenKey of [
      'admin.productCenter.overview.title',
      'admin.productCenter.products.title',
      'admin.productCenter.skus.title',
      'admin.productCenter.brands.title',
      'admin.productCenter.categories.title',
      'admin.productCenter.attributes.title',
      'admin.productCenter.stocks.title',
      'admin.productCenter.movements.title',
      'admin.productCenter.reservations.title',
      'admin.productCenter.shipments.title',
      'admin.productCenter.logistics.title',
    ]) {
      expect(productCenterAdminMessages.en[screenKey], `missing en key ${screenKey}`).toBeTruthy();
      expect(productCenterAdminMessages.zh[screenKey], `missing zh key ${screenKey}`).toBeTruthy();
    }
  });
});
