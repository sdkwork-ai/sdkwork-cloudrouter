import { describe, expect, it } from 'vitest';

import {
  createProductCenterService,
  describeProductCenterError,
  type Attribute,
  type AttributeValue,
  type Brand,
  type CarrierSummary,
  type Category,
  type CategoryAttribute,
  type FulfillmentSummary,
  type InventoryMovement,
  type InventoryReservation,
  type InventoryStock,
  type Media,
  type PriceList,
  type PriceListItem,
  type Product,
  type ProductCenterCatalogPort,
  type ProductCenterCarriersPort,
  type ProductCenterFulfillmentsPort,
  type ProductCenterInventoryPort,
  type ProductCenterShipmentsPort,
  type ShipmentPackageSummary,
  type ShipmentSummary,
  type ShipmentTrackingEventSummary,
  type Sku,
} from './productCenterService.ts';

const product = {
  id: 'p-1',
  productNo: 'P-1',
  name: 'Router',
  title: 'Router',
  categoryId: 'c-1',
  brandId: 'b-1',
  productType: 'physical',
  status: 'draft',
  salesStatus: 'inactive',
  version: '3',
} as unknown as Product;

const sku = {
  id: 's-1',
  skuNo: 'S-1',
  name: 'Router 128G',
  title: 'Router 128G',
  productId: 'p-1',
  salePriceMinor: '129900',
  currencyCode: 'CNY',
  minorUnitExponent: '2',
  inventoryTracking: 'quantity',
  status: 'active',
  version: '2',
} as unknown as Sku;

const category = {
  id: 'c-1',
  categoryNo: 'C-1',
  name: 'Routers',
  status: 'active',
  version: '1',
} as unknown as Category;

const attribute = {
  id: 'a-1',
  attributeNo: 'A-1',
  name: 'Color',
  valueType: 'enum',
  inputHint: 'select',
  status: 'active',
  version: '1',
} as unknown as Attribute;

const categoryAttribute = {
  id: 'ca-1',
  categoryId: 'c-1',
  attributeId: 'a-1',
  attributeRole: 'key',
  required: true,
  status: 'active',
  version: '4',
} as unknown as CategoryAttribute;

const brand = {
  id: 'b-1',
  brandNo: 'B-1',
  name: 'SDKWork',
  status: 'active',
  version: '1',
} as unknown as Brand;

const attributeValue = {
  id: 'av-1',
  attributeId: 'a-1',
  valueCode: 'BLACK',
  displayValue: 'Black',
  sortOrder: '0',
  status: 'active',
  version: '2',
} as unknown as AttributeValue;

const media = {
  id: 'md-1',
  ownerType: 'spu',
  ownerId: 'p-1',
  mediaRole: 'main_image',
  mediaResourceId: 'av-1',
  resourceSnapshot: { id: 'r-1', kind: 'image', source: 'external_url', url: 'https://cdn/x.jpg' },
  sortOrder: '0',
  status: 'active',
  version: '1',
} as unknown as Media;

const priceList = {
  id: 'pl-1',
  priceListNo: 'PL-1',
  name: 'Retail CNY',
  currencyCode: 'CNY',
  currencySymbol: '¥',
  status: 'active',
  version: '3',
} as unknown as PriceList;

const priceListItem = {
  id: 'pli-1',
  listId: 'pl-1',
  skuId: 's-1',
  currencyCode: 'CNY',
  minorUnitExponent: '2',
  priceMinor: '9900',
  minQuantity: '1',
  status: 'active',
  version: '4',
} as unknown as PriceListItem;

const stock = {
  id: 'st-1',
  skuId: 's-1',
  availableQuantity: '90',
  reservedQuantity: '10',
  status: 'active',
} as unknown as InventoryStock;

const movement = {
  id: 'm-1',
  skuId: 's-1',
  movementType: 'inbound',
  quantity: '100',
} as unknown as InventoryMovement;

const reservation = {
  id: 'r-1',
  skuId: 's-1',
  quantity: '1',
  status: 'reserved',
} as unknown as InventoryReservation;

const shipment = {
  shipmentId: 'sh-1',
  shipmentNo: 'SH-1',
  fulfillmentId: 'f-1',
  carrierCode: 'SF',
  trackingNo: 'SF123',
  status: 'shipped',
} as unknown as ShipmentSummary;

const shipmentPackage = {
  packageId: 'pk-1',
  shipmentId: 'sh-1',
  packageNo: 'PK-1',
  packageType: 'box',
  status: 'pending',
} as unknown as ShipmentPackageSummary;

const trackingEvent = {
  eventId: 'te-1',
  trackingEventNo: 'TE-1',
  eventType: 'in_transit',
  eventTime: '2026-11-18T00:00:00Z',
} as unknown as ShipmentTrackingEventSummary;

const carrier = {
  carrierId: 'car-1',
  carrierCode: 'sf',
  carrierName: 'SF Express',
  status: 'active',
  sortOrder: 0,
} as unknown as CarrierSummary;

interface PageResult<T> {
  items: T[];
  pageInfo: { mode: 'offset'; page: number; pageSize: number; totalItems?: string; hasMore?: boolean };
}

function pageOf<T>(items: T[], totalItems?: string): PageResult<T> {
  return {
    items,
    pageInfo: {
      mode: 'offset',
      page: 1,
      pageSize: 20,
      ...(totalItems === undefined ? {} : { totalItems }),
    },
  };
}

interface RecordedCall {
  method: string;
  args: unknown[];
}

function createStubPorts() {
  const calls: RecordedCall[] = [];
  const track = (method: string, args: unknown[]) => {
    calls.push({ method, args });
  };

  const catalog = {
    products: {
      management: {
        list: async (params: unknown) => {
          track('products.list', [params]);
          return pageOf([product], '41');
        },
        retrieve: async (productId: string) => {
          track('products.retrieve', [productId]);
          return product;
        },
      },
      attributes: {
        update: async (productId: string, body: unknown, params: unknown) => {
          track('products.attributes.update', [productId, body, params]);
          return { attributes: [], version: '4' };
        },
      },
      create: async (body: unknown) => {
        track('products.create', [body]);
        return product;
      },
      update: async (productId: string, params: unknown, body: unknown) => {
        track('products.update', [productId, params, body]);
        return product;
      },
      publish: async (productId: string, params: unknown) => {
        track('products.publish', [productId, params]);
        return product;
      },
      archive: async (productId: string, params: unknown) => {
        track('products.archive', [productId, params]);
        return product;
      },
      delete: async (productId: string, params: unknown) => {
        track('products.delete', [productId, params]);
      },
    },
    skus: {
      list: async (params: unknown) => {
        track('skus.list', [params]);
        return pageOf([sku], '7');
      },
      create: async (body: unknown) => {
        track('skus.create', [body]);
        return sku;
      },
      update: async (skuId: string, params: unknown, body: unknown) => {
        track('skus.update', [skuId, params, body]);
        return sku;
      },
      delete: async (skuId: string, params: unknown) => {
        track('skus.delete', [skuId, params]);
      },
    },
    categories: {
      management: {
        list: async (params: unknown) => {
          track('categories.list', [params]);
          return pageOf([category], '3');
        },
      },
      create: async (body: unknown) => {
        track('categories.create', [body]);
        return category;
      },
      update: async (categoryId: string, params: unknown, body: unknown) => {
        track('categories.update', [categoryId, params, body]);
        return category;
      },
      delete: async (categoryId: string, params: unknown) => {
        track('categories.delete', [categoryId, params]);
      },
    },
    attributes: {
      management: {
        list: async (params: unknown) => {
          track('attributes.list', [params]);
          return pageOf([attribute], '7');
        },
      },
      create: async (body: unknown) => {
        track('attributes.create', [body]);
        return attribute;
      },
      update: async (attributeId: string, params: unknown, body: unknown) => {
        track('attributes.update', [attributeId, params, body]);
        return attribute;
      },
    },
    categoryAttributes: {
      list: async (params: unknown) => {
        track('categoryAttributes.list', [params]);
        return pageOf([categoryAttribute], '2');
      },
      create: async (body: unknown) => {
        track('categoryAttributes.create', [body]);
        return categoryAttribute;
      },
      update: async (bindingId: string, params: unknown, body: unknown) => {
        track('categoryAttributes.update', [bindingId, params, body]);
        return categoryAttribute;
      },
      delete: async (bindingId: string, params: unknown) => {
        track('categoryAttributes.delete', [bindingId, params]);
      },
    },
    brands: {
      list: async (params: unknown) => {
        track('brands.list', [params]);
        return pageOf([brand], '1');
      },
      create: async (body: unknown) => {
        track('brands.create', [body]);
        return brand;
      },
      update: async (brandId: string, params: unknown, body: unknown) => {
        track('brands.update', [brandId, params, body]);
        return brand;
      },
      delete: async (brandId: string, params: unknown) => {
        track('brands.delete', [brandId, params]);
      },
    },
    attributeValues: {
      list: async (params: unknown) => {
        track('attributeValues.list', [params]);
        return pageOf([attributeValue], '2');
      },
      create: async (body: unknown) => {
        track('attributeValues.create', [body]);
        return attributeValue;
      },
      update: async (valueId: string, params: unknown, body: unknown) => {
        track('attributeValues.update', [valueId, params, body]);
        return attributeValue;
      },
      delete: async (valueId: string, params: unknown) => {
        track('attributeValues.delete', [valueId, params]);
      },
    },
    media: {
      list: async (params: unknown) => {
        track('media.list', [params]);
        return pageOf([media], '1');
      },
      create: async (body: unknown) => {
        track('media.create', [body]);
        return media;
      },
      update: async (mediaId: string, body: unknown, params: unknown) => {
        track('media.update', [mediaId, body, params]);
        return media;
      },
      delete: async (mediaId: string, params: unknown) => {
        track('media.delete', [mediaId, params]);
      },
    },
    priceLists: {
      list: async (params: unknown) => {
        track('priceLists.list', [params]);
        return pageOf([priceList], '3');
      },
      create: async (body: unknown) => {
        track('priceLists.create', [body]);
        return priceList;
      },
      update: async (priceListId: string, params: unknown, body: unknown) => {
        track('priceLists.update', [priceListId, params, body]);
        return priceList;
      },
      retrieve: async (priceListId: string) => {
        track('priceLists.retrieve', [priceListId]);
        return priceList;
      },
    },
    priceListItems: {
      list: async (params: unknown) => {
        track('priceListItems.list', [params]);
        return pageOf([priceListItem], '5');
      },
      create: async (body: unknown) => {
        track('priceListItems.create', [body]);
        return priceListItem;
      },
      update: async (itemId: string, body: unknown, params: unknown) => {
        track('priceListItems.update', [itemId, body, params]);
        return priceListItem;
      },
      delete: async (itemId: string, params: unknown) => {
        track('priceListItems.delete', [itemId, params]);
      },
    },
  } as unknown as ProductCenterCatalogPort;

  const inventory = {
    stocks: {
      list: async (params: unknown) => {
        track('stocks.list', [params]);
        return pageOf([stock], '5');
      },
      update: async (stockId: string, body: unknown) => {
        track('stocks.update', [stockId, body]);
        return stock;
      },
      adjustments: {
        create: async (stockId: string, body: unknown) => {
          track('stocks.adjustments.create', [stockId, body]);
          return stock;
        },
      },
    },
    movements: {
      list: async (params: unknown) => {
        track('movements.list', [params]);
        return pageOf([movement], '9');
      },
    },
    reservations: {
      list: async (params: unknown) => {
        track('reservations.list', [params]);
        return pageOf([reservation], '4');
      },
    },
  } as unknown as ProductCenterInventoryPort;

  const shipments = {
    list: async (params: unknown) => {
      track('shipments.list', [params]);
      return pageOf([shipment], '6');
    },
    retrieve: async (shipmentId: string) => {
      track('shipments.retrieve', [shipmentId]);
      return shipment;
    },
    create: async (body: unknown, params: unknown) => {
      track('shipments.create', [body, params]);
      return shipment;
    },
    packages: {
      management: {
        list: async (shipmentId: string, params: unknown) => {
          track('packages.list', [shipmentId, params]);
          return pageOf([shipmentPackage], '1');
        },
      },
      create: async (shipmentId: string, body: unknown, params: unknown) => {
        track('packages.create', [shipmentId, body, params]);
        return shipmentPackage;
      },
      update: async (shipmentId: string, packageId: string, body: unknown, params: unknown) => {
        track('packages.update', [shipmentId, packageId, body, params]);
        return shipmentPackage;
      },
    },
    trackingEvents: {
      management: {
        list: async (shipmentId: string, params: unknown) => {
          track('trackingEvents.list', [shipmentId, params]);
          return pageOf([trackingEvent], '3');
        },
      },
      create: async (shipmentId: string, body: unknown, params: unknown) => {
        track('trackingEvents.create', [shipmentId, body, params]);
        return trackingEvent;
      },
    },
  } as unknown as ProductCenterShipmentsPort;

  const carriers = {
    list: async (params: unknown) => {
      track('carriers.list', [params]);
      return pageOf([carrier], '2');
    },
    create: async (body: unknown, params: unknown) => {
      track('carriers.create', [body, params]);
      return carrier;
    },
    update: async (carrierId: string, body: unknown, params: unknown) => {
      track('carriers.update', [carrierId, body, params]);
      return carrier;
    },
  } as unknown as ProductCenterCarriersPort;

  const fulfillment = {
    fulfillmentId: 'f-1',
    fulfillmentNo: 'FUL-1',
    orderId: 'order-1',
    fulfillmentType: 'physical_shipment',
    status: 'awaiting_shipment',
  } as unknown as FulfillmentSummary;

  const fulfillments = {
    management: {
      list: async (params: unknown) => {
        track('fulfillments.list', [params]);
        return pageOf([fulfillment], '1');
      },
    },
  } as unknown as ProductCenterFulfillmentsPort;

  return { calls, catalog, inventory, shipments, carriers, fulfillments };
}

function callFor(calls: RecordedCall[], method: string): RecordedCall {
  const call = calls.find((candidate) => candidate.method === method);
  if (!call) {
    throw new Error(`expected a ${method} call, saw ${calls.map((candidate) => candidate.method).join(', ')}`);
  }
  return call;
}

describe('Product Center service', () => {
  it('normalizes page info and forwards only the filters that were set', async () => {
    const { calls, catalog } = createStubPorts();
    const service = createProductCenterService({ catalog });

    const result = await service.listProducts({ page: 2, pageSize: 20, q: 'router', status: '' });

    expect(result.pageInfo.totalItems).toBe(41);
    expect(result.pageInfo.hasNextPage).toBe(true);
    const [params] = callFor(calls, 'products.list').args as [Record<string, unknown>];
    expect(params.q).toBe('router');
    expect(params.page).toBe(2);
    expect('status' in params).toBe(false);
  });

  it('sends the read version back as If-Match on every guarded write', async () => {
    const { calls, catalog } = createStubPorts();
    const service = createProductCenterService({ catalog });

    await service.updateProduct('p-1', '3', { title: 'Router Pro' });
    expect(callFor(calls, 'products.update').args).toEqual([
      'p-1',
      { ifMatch: '3' },
      { title: 'Router Pro' },
    ]);

    await service.publishProduct('p-1', '3');
    expect(callFor(calls, 'products.publish').args).toEqual(['p-1', { ifMatch: '3' }]);

    await service.archiveProduct('p-1', '3');
    expect(callFor(calls, 'products.archive').args).toEqual(['p-1', { ifMatch: '3' }]);

    await service.updateCategory('c-1', '1', { name: 'Routers' });
    expect(callFor(calls, 'categories.update').args[1]).toEqual({ ifMatch: '1' });

    await service.deleteCategory('c-1', '1');
    expect(callFor(calls, 'categories.delete').args).toEqual(['c-1', { ifMatch: '1' }]);

    await service.updateSku('s-1', '2', { title: 'Router 128G' });
    expect(callFor(calls, 'skus.update').args[1]).toEqual({ ifMatch: '2' });

    await service.updateAttribute('a-1', '1', { name: 'Colour' });
    expect(callFor(calls, 'attributes.update').args[1]).toEqual({ ifMatch: '1' });

    await service.updateBrand('b-1', '1', { name: 'SDKWork' });
    expect(callFor(calls, 'brands.update').args[1]).toEqual({ ifMatch: '1' });

    await service.updateCategoryAttribute('ca-1', '4', { required: false });
    expect(callFor(calls, 'categoryAttributes.update').args[1]).toEqual({ ifMatch: '4' });

    await service.deleteCategoryAttribute('ca-1', '4');
    expect(callFor(calls, 'categoryAttributes.delete').args).toEqual(['ca-1', { ifMatch: '4' }]);

    await service.deleteProduct('p-1', '5');
    expect(callFor(calls, 'products.delete').args).toEqual(['p-1', { ifMatch: '5' }]);
    await service.deleteSku('sku-1', '2');
    expect(callFor(calls, 'skus.delete').args).toEqual(['sku-1', { ifMatch: '2' }]);
    await service.deleteBrand('b-1', '1');
    expect(callFor(calls, 'brands.delete').args).toEqual(['b-1', { ifMatch: '1' }]);
  });

  it('maps inventory reads and the guarded stock adjustment', async () => {
    const { calls, inventory } = createStubPorts();
    const service = createProductCenterService({ inventory });

    const stocks = await service.listStocks({ page: 1, pageSize: 20, skuId: 's-1' });
    expect(stocks.items[0]?.id).toBe('st-1');
    expect(stocks.pageInfo.totalItems).toBe(5);
    expect((callFor(calls, 'stocks.list').args[0] as Record<string, unknown>).skuId).toBe('s-1');

    await service.updateStock('st-1', { availableQuantity: '80', safetyStockQuantity: '5' });
    expect(callFor(calls, 'stocks.update').args).toEqual([
      'st-1',
      { availableQuantity: '80', safetyStockQuantity: '5' },
    ]);

    await service.listMovements({ page: 1, pageSize: 20, movementType: 'inbound' });
    expect((callFor(calls, 'movements.list').args[0] as Record<string, unknown>).movementType).toBe('inbound');

    await service.listReservations({ page: 1, pageSize: 20, orderId: 'o-1' });
    expect((callFor(calls, 'reservations.list').args[0] as Record<string, unknown>).orderId).toBe('o-1');
  });

  it('records an inventory movement through the adjustment command, not an absolute overwrite', async () => {
    const { calls, inventory } = createStubPorts();
    const service = createProductCenterService({ inventory });

    await service.adjustStock('st-1', {
      quantityDelta: '-5',
      movementType: 'outbound',
      reason: 'damaged in warehouse',
    });

    expect(callFor(calls, 'stocks.adjustments.create').args).toEqual([
      'st-1',
      { quantityDelta: '-5', movementType: 'outbound', reason: 'damaged in warehouse' },
    ]);
  });

  it('keeps order shipment pagination as the string contract the SDK documents', async () => {
    const { calls, shipments } = createStubPorts();
    const service = createProductCenterService({ shipments });

    const result = await service.listShipments({ page: 3, pageSize: 20, status: 'shipped' });
    expect(result.pageInfo.totalItems).toBe(6);
    expect(result.pageInfo.hasNextPage).toBe(false);
    expect(callFor(calls, 'shipments.list').args[0]).toEqual({
      status: 'shipped',
      page: '3',
      pageSize: '20',
    });

    await service.listShipmentPackages('sh-1', { page: 1, pageSize: 50 });
    expect(callFor(calls, 'packages.list').args).toEqual(['sh-1', { page: '1', pageSize: '50' }]);
  });

  it('sends an Idempotency-Key for package create and update', async () => {    const { calls, shipments } = createStubPorts();
    const service = createProductCenterService({ shipments });

    await service.createShipmentPackage('sh-1', { packageType: 'box' });
    const createParams = callFor(calls, 'packages.create').args[2] as { idempotencyKey?: string };
    expect(typeof createParams.idempotencyKey).toBe('string');
    expect(createParams.idempotencyKey?.length).toBeGreaterThan(10);

    await service.updateShipmentPackage('sh-1', 'pk-1', { trackingNo: 'SF999' });
    const updateParams = callFor(calls, 'packages.update').args[3] as { idempotencyKey?: string };
    expect(typeof updateParams.idempotencyKey).toBe('string');
    expect((callFor(calls, 'packages.update').args[2] as Record<string, unknown>).trackingNo).toBe('SF999');
  });

  it('manages attribute values, media, prices, and product attributes on the catalog contract', async () => {
    const { calls, catalog } = createStubPorts();
    const service = createProductCenterService({ catalog });

    const values = await service.listAttributeValues({ attributeId: 'a-1', page: 1, pageSize: 20 });
    expect(values.items[0]?.id).toBe('av-1');
    expect(values.pageInfo.totalItems).toBe(2);
    expect((callFor(calls, 'attributeValues.list').args[0] as Record<string, unknown>).attributeId).toBe('a-1');

    await service.createAttributeValue({ attributeId: 'a-1', valueCode: 'RED', displayValue: 'Red' });
    expect(callFor(calls, 'attributeValues.create').args[0]).toMatchObject({ valueCode: 'RED' });
    await service.updateAttributeValue('av-1', '2', { displayValue: 'Jet black' });
    expect(callFor(calls, 'attributeValues.update').args[1]).toEqual({ ifMatch: '2' });
    await service.deleteAttributeValue('av-1', '2');
    expect(callFor(calls, 'attributeValues.delete').args).toEqual(['av-1', { ifMatch: '2' }]);

    await service.retrieveProduct('p-1');
    expect(callFor(calls, 'products.retrieve').args).toEqual(['p-1']);
    const inputs = [{ attributeId: 'a-1', role: 'key' as const, attributeValueId: 'av-1' }];
    await service.replaceProductAttributes('p-1', '3', inputs);
    expect(callFor(calls, 'products.attributes.update').args).toEqual([
      'p-1',
      { attributes: inputs },
      { ifMatch: '3' },
    ]);

    await service.listMedia({ ownerType: 'spu', ownerId: 'p-1', page: 1, pageSize: 20 });
    expect(callFor(calls, 'media.list').args[0]).toMatchObject({ ownerType: 'spu', ownerId: 'p-1' });
    await service.createMedia({
      ownerType: 'spu',
      ownerId: 'p-1',
      mediaRole: 'main_image',
      resource: { id: 'r-2', kind: 'image', source: 'external_url', url: 'https://cdn/y.jpg' },
    });
    expect(callFor(calls, 'media.create').args[0]).toMatchObject({ mediaRole: 'main_image' });
    await service.updateMedia('md-1', '1', { altText: 'Main' });
    expect(callFor(calls, 'media.update').args[2]).toEqual({ ifMatch: '1' });
    await service.deleteMedia('md-1', '1');
    expect(callFor(calls, 'media.delete').args).toEqual(['md-1', { ifMatch: '1' }]);

    await service.listPriceLists({ page: 1, pageSize: 20, status: 'active' });
    await service.createPriceList({ priceListNo: 'PL-1', name: 'Retail', currencyCode: 'CNY' });
    await service.updatePriceList('pl-1', '3', { name: 'Retail v2' });
    expect(callFor(calls, 'priceLists.update').args[1]).toEqual({ ifMatch: '3' });
    await service.retrievePriceList('pl-1');
    expect(callFor(calls, 'priceLists.retrieve').args).toEqual(['pl-1']);

    const items = await service.listPriceListItems({ listId: 'pl-1', page: 1, pageSize: 20 });
    expect(items.pageInfo.totalItems).toBe(5);
    expect((callFor(calls, 'priceListItems.list').args[0] as Record<string, unknown>).listId).toBe('pl-1');
    await service.createPriceListItem({ listId: 'pl-1', skuId: 's-1', priceMinor: '9900' });
    expect(callFor(calls, 'priceListItems.create').args[0]).toMatchObject({ listId: 'pl-1', skuId: 's-1' });
    await service.updatePriceListItem('pli-1', '4', { priceMinor: '8800' });
    expect(callFor(calls, 'priceListItems.update').args[2]).toEqual({ ifMatch: '4' });
    await service.deletePriceListItem('pli-1', '4');
    expect(callFor(calls, 'priceListItems.delete').args).toEqual(['pli-1', { ifMatch: '4' }]);
  });

  it('records and reads the shipment tracking timeline through the order contract', async () => {
    const { calls, shipments } = createStubPorts();
    const service = createProductCenterService({ shipments });

    const page = await service.listShipmentTrackingEvents({ shipmentId: 'sh-1', page: 2, pageSize: 20 });
    expect(page.items[0]?.eventId).toBe('te-1');
    expect(page.pageInfo.totalItems).toBe(3);
    expect(callFor(calls, 'trackingEvents.list').args).toEqual(['sh-1', { page: '2', pageSize: '20' }]);

    await service.createShipmentTrackingEvent('sh-1', {
      eventType: 'in_transit',
      locationText: 'Sorting centre',
    });
    const args = callFor(calls, 'trackingEvents.create').args;
    expect(args[0]).toBe('sh-1');
    expect(args[1]).toMatchObject({ eventType: 'in_transit', locationText: 'Sorting centre' });
    expect(typeof (args[2] as { idempotencyKey?: string }).idempotencyKey).toBe('string');
  });

  it('manages the carrier registry through the order contract', async () => {
    const { calls, carriers } = createStubPorts();
    const service = createProductCenterService({ carriers });

    const page = await service.listCarriers({ page: 1, pageSize: 20, status: 'active' });
    expect(page.items[0]?.carrierCode).toBe('sf');
    expect(callFor(calls, 'carriers.list').args[0]).toMatchObject({ status: 'active', page: '1', pageSize: '20' });

    await service.createCarrier({ carrierCode: 'sf', carrierName: 'SF Express' });
    expect(callFor(calls, 'carriers.create').args[0]).toMatchObject({ carrierCode: 'sf' });

    await service.updateCarrier('car-1', { carrierName: 'SF Express (updated)' });
    expect(callFor(calls, 'carriers.update').args[0]).toBe('car-1');
    expect(typeof callFor(calls, 'carriers.update').args[2]).toBe('object');
  });

  it('creates a shipment from a fulfillment with an idempotency key', async () => {
    const { calls, fulfillments, shipments } = createStubPorts();
    const service = createProductCenterService({ fulfillments, shipments });

    const page = await service.listFulfillments({
      page: 1,
      pageSize: 20,
      orderId: 'order-1',
      status: 'awaiting_shipment',
    });
    expect(page.items[0]?.fulfillmentNo).toBe('FUL-1');
    expect(callFor(calls, 'fulfillments.list').args[0]).toMatchObject({
      orderId: 'order-1',
      status: 'awaiting_shipment',
      page: '1',
      pageSize: '20',
    });

    const created = await service.createShipment({
      fulfillmentId: 'f-1',
      carrierCode: 'sf',
      trackingNo: 'SF-1',
    });
    expect(created.shipmentNo).toBe('SH-1');
    expect(callFor(calls, 'shipments.create').args[0]).toMatchObject({
      fulfillmentId: 'f-1',
      carrierCode: 'sf',
      trackingNo: 'SF-1',
    });
    // The write must carry an idempotency key so a retry cannot create a second
    // shipment for the same fulfillment.
    expect(callFor(calls, 'shipments.create').args[1]).toMatchObject({
      idempotencyKey: expect.any(String),
    });
  });

  it('aggregates the overview and names the sources it could not read', async () => {
    const { catalog, inventory, shipments } = createStubPorts();
    const brokenInventory = {
      stocks: {
        list: async () => {
          throw new Error('inventory offline');
        },
      },
      movements: inventory.movements,
      reservations: inventory.reservations,
    } as unknown as ProductCenterInventoryPort;

    const service = createProductCenterService({
      catalog,
      inventory: brokenInventory,
      shipments,
    });
    const overview = await service.loadOverview();

    expect(overview.products).toBe(41);
    expect(overview.categories).toBe(3);
    expect(overview.skus).toBe(7);
    expect(overview.shipments).toBe(6);
    expect(overview.stocks).toBeUndefined();
    expect(overview.unavailable).toEqual(['stocks']);
  });

  it('projects a ProblemDetail-shaped failure without losing the trace id', () => {
    expect(describeProductCenterError({
      code: 41201,
      traceId: 'trace-1',
      i18nKey: 'product.version.stale',
      message: 'Stale version',
    })).toEqual({
      code: 41201,
      traceId: 'trace-1',
      i18nKey: 'product.version.stale',
      message: 'Stale version',
    });

    expect(describeProductCenterError('boom')).toEqual({ message: 'Product Center request failed' });
  });
});
