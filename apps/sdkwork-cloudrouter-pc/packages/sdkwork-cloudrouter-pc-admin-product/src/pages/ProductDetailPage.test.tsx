import i18n from 'i18next';
import { render, screen } from '@testing-library/react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';

import { productCenterAdminMessages } from '../i18n/index.ts';
import { ProductDetailPage } from './ProductDetailPage.tsx';
import type { ProductCenterService } from '../productCenterService.ts';

const product = {
  id: 'p-1',
  tenantId: 't-1',
  organizationId: 'o-1',
  productNo: 'P-1',
  categoryId: 'c-1',
  brandId: 'b-1',
  name: 'Router',
  title: 'Router Pro',
  productType: 'physical',
  status: 'draft',
  salesStatus: 'inactive',
  attributes: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  version: '3',
} as unknown as Awaited<ReturnType<ProductCenterService['retrieveProduct']>>;

function pageOf<T>(items: T[]) {
  return { items, pageInfo: { page: 1, pageSize: 20, totalItems: items.length, hasNextPage: false } };
}

function createStubService(): ProductCenterService {
  return {
    retrieveProduct: async () => product,
    listCategoryAttributes: async () => pageOf([{
      id: 'ca-1',
      attributeId: 'a-1',
      categoryId: 'c-1',
      attributeRole: 'key',
      required: true,
      searchable: true,
      filterable: true,
      comparable: false,
      sortOrder: '0',
      status: 'active',
      version: '1',
    }]),
    listAttributes: async () => pageOf([{
      id: 'a-1',
      attributeNo: 'A-1',
      name: 'Colour',
      valueType: 'enum',
      inputHint: 'select',
      isMultiValue: false,
      status: 'active',
      sortOrder: '0',
      version: '1',
    }]),
    listAttributeValues: async () => pageOf([{
      id: 'av-1',
      attributeId: 'a-1',
      valueCode: 'BLACK',
      displayValue: 'Black',
      sortOrder: '0',
      status: 'active',
      version: '1',
    }]),
    listMedia: async () => pageOf([]),
    listSkus: async () => pageOf([{
      id: 's-1',
      productId: 'p-1',
      skuNo: 'P-1-01',
      name: 'Router Pro - Black',
      title: 'Router Pro - Black',
      currencyCode: 'CNY',
      currencySymbol: '¥',
      minorUnitExponent: '2',
      salePriceMinor: '129900',
      minOrderQuantity: '1',
      stepQuantity: '1',
      fulfillmentType: 'physical',
      inventoryTracking: 'quantity',
      inventoryPolicy: 'deny',
      status: 'active',
      salesStatus: 'active',
      attributeValues: [{ attributeId: 'a-1', attributeValueId: 'av-1', attributeNo: 'A-1', valueCode: 'BLACK', displayValue: 'Black' }],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      version: '1',
    }]),
    listCategories: async () => pageOf([{
      id: 'c-1',
      categoryNo: 'C-1',
      name: 'Routers',
      path: '/C-1',
      depth: '1',
      isLeaf: true,
      status: 'active',
      sortOrder: '0',
      version: '1',
    }]),
    listBrands: async () => pageOf([{
      id: 'b-1',
      brandNo: 'B-1',
      name: 'SDKWork',
      status: 'active',
      sortOrder: '0',
      version: '1',
    }]),
  } as unknown as ProductCenterService;
}

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: productCenterAdminMessages.en } },
    interpolation: { escapeValue: false },
  });
});

describe('ProductDetailPage', () => {
  it('renders product facts, the category attribute editor, and the SKU matrix', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ProductDetailPage productId="p-1" service={createStubService()} />
      </I18nextProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Router Pro' })).toBeTruthy();
    expect(await screen.findByText('Product attributes')).toBeTruthy();
    expect(await screen.findByText('Colour')).toBeTruthy();
    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(await screen.findByText('P-1-01')).toBeTruthy();
    expect(await screen.findByText('Routers')).toBeTruthy();
  });
});
