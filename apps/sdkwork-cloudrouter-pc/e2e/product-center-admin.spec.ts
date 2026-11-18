import { expect, test, type Page } from '@playwright/test';

// The dev server optimizes dependencies on the first navigation, which can
// exceed the default 30s navigation budget; every later page is warm.
test.use({ navigationTimeout: 60_000 });

const PERMISSION_SCOPE = [
  'cloudrouter.admin.access',
  'cloudrouter.console.access',
  'cloudrouter.system.read',
  'commerce.catalog.read',
  'commerce.catalog.manage',
  'commerce.inventory.read',
  'commerce.inventory.manage',
  'commerce.orders.read',
  'commerce.orders.manage',
];

function buildAdminSession(): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1_000);
  return {
    accessToken: 'e2e-access-token',
    authToken: 'e2e-auth-token',
    refreshToken: 'e2e-refresh-token',
    sessionId: 'product-center-session',
    expiresAt: now + 3_600,
    storedAt: now,
    context: {
      tenantId: '100001',
      organizationId: '0',
      userId: 'product-admin',
      sessionId: 'product-center-session',
      appId: 'sdkwork-cloudrouter',
      environment: 'dev',
      deploymentMode: 'standalone',
      authLevel: 'password',
      permissionScope: PERMISSION_SCOPE,
      standardRoleCodes: ['backend-root-admin'],
    },
  };
}

const PRODUCT = {
  id: 'p-1',
  productNo: 'P-1',
  name: 'Router',
  title: 'Router',
  categoryId: 'c-1',
  status: 'draft',
  salesStatus: 'inactive',
  productType: 'physical',
  attributes: [],
  media: [],
  version: '3',
};

const CATEGORY_ROOTS = [
  {
    id: 'c-1',
    categoryNo: 'C-1',
    name: 'Routers',
    path: '/C-1',
    depth: '1',
    isLeaf: false,
    status: 'active',
    sortOrder: '0',
    version: '1',
  },
  {
    id: 'c-2',
    categoryNo: 'C-2',
    name: 'Accessories',
    path: '/C-2',
    depth: '1',
    isLeaf: true,
    status: 'active',
    sortOrder: '1',
    version: '1',
  },
];

const CATEGORY_CHILDREN = [
  {
    id: 'c-3',
    parentId: 'c-1',
    categoryNo: 'C-1-1',
    name: 'Mesh routers',
    path: '/C-1/C-1-1',
    depth: '2',
    isLeaf: true,
    status: 'active',
    sortOrder: '0',
    version: '1',
  },
];

const STOCK = {
  id: 's-1',
  tenantId: '100001',
  skuId: 'sku-1',
  availableQuantity: '10',
  reservedQuantity: '0',
  safetyStockQuantity: '2',
  version: '1',
  status: 'active',
};

const SHIPMENT = {
  shipmentId: 'sh-1',
  shipmentNo: 'SH-2026-1',
  fulfillmentId: 'f-1',
  carrierCode: 'sf',
  trackingNo: 'SF123456',
  status: 'shipped',
};

const CARRIER = {
  carrierId: 'car-1',
  carrierCode: 'sf',
  carrierName: 'SF Express',
  status: 'active',
  sortOrder: 0,
};

const TRACKING_EVENT = {
  eventId: 'te-1',
  trackingEventNo: 'TE-1',
  eventType: 'in_transit',
  eventTime: '2026-11-18T00:00:00Z',
};

const CATEGORY_ATTRIBUTE = {
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
};

const ATTRIBUTE = {
  id: 'a-1',
  attributeNo: 'A-1',
  name: 'Colour',
  valueType: 'enum',
  inputHint: 'select',
  isMultiValue: false,
  status: 'active',
  sortOrder: '0',
  version: '1',
};

const ATTRIBUTE_VALUE = {
  id: 'av-1',
  attributeId: 'a-1',
  valueCode: 'BLACK',
  displayValue: 'Black',
  sortOrder: '0',
  status: 'active',
  version: '1',
};

const SKU = {
  id: 'sku-1',
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
  attributeValues: [
    {
      attributeId: 'a-1',
      attributeValueId: 'av-1',
      attributeNo: 'A-1',
      valueCode: 'BLACK',
      displayValue: 'Black',
    },
  ],
  version: '1',
};

const PRICE_LIST = {
  id: 'pl-1',
  priceListNo: 'PL-1',
  name: 'Retail CNY',
  currencyCode: 'CNY',
  status: 'active',
  version: '1',
};

const FULFILLMENT = {
  fulfillmentId: 'f-1',
  fulfillmentNo: 'FUL-2026-1',
  orderId: 'order-1',
  fulfillmentType: 'physical_shipment',
  status: 'awaiting_shipment',
};

const CREATED_SHIPMENT = {
  shipmentId: 'sh-2',
  shipmentNo: 'SHP-E2E',
  fulfillmentId: 'f-1',
  carrierCode: 'sf',
  trackingNo: 'SF-E2E-1',
  status: 'created',
};

const MEDIA_ITEM = {
  id: 'media-1',
  ownerType: 'spu',
  ownerId: 'p-1',
  mediaRole: 'main_image',
  resourceSnapshot: {
    id: '1234567890123456789',
    kind: 'image',
    source: 'external_url',
    url: 'https://cdn.example.com/p.jpg',
  },
  sortOrder: '0',
  status: 'active',
  version: '1',
};

function pageInfo(pageSize = 20, totalItems = 0) {
  return { mode: 'offset', page: 1, pageSize, totalItems, totalPages: totalItems > 0 ? 1 : 0 };
}

interface CapturedWrite {
  method: string;
  path: string;
  idempotencyKey: string;
  ifMatch: string;
  body: string;
}

function captureWrites(page: Page): CapturedWrite[] {
  const writes: CapturedWrite[] = [];
  page.on('request', (request) => {
    const requestUrl = new URL(request.url());
    if (request.method() === 'GET' || !requestUrl.pathname.startsWith('/backend/')) {
      return;
    }
    writes.push({
      method: request.method(),
      path: requestUrl.pathname,
      idempotencyKey: request.headers()['idempotency-key'] ?? '',
      ifMatch: request.headers()['if-match'] ?? '',
      body: request.postData() ?? '',
    });
  });
  return writes;
}

async function waitForWrite(
  writes: CapturedWrite[],
  method: string,
  path: string,
): Promise<CapturedWrite> {
  await expect
    .poll(() => writes.some((write) => write.method === method && write.path === path))
    .toBe(true);
  const write = writes.find((candidate) => candidate.method === method && candidate.path === path);
  if (!write) {
    throw new Error(`expected a ${method} ${path} request`);
  }
  return write;
}

async function seedAdminSession(page: Page): Promise<void> {
  await page.addInitScript((session) => {
    localStorage.setItem('sdkwork.cloudRouter.appSession.v1', JSON.stringify(session));
    localStorage.setItem('user_explicit_lang', 'zh-CN');
  }, buildAdminSession());
}

async function mockProductCenterApi(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;
    const fulfill = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data }),
    });
    const emptyPage = () => fulfill({ items: [], pageInfo: pageInfo(20, 0) });
    const created = (item: unknown) => route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: { item } }),
    });
    const method = route.request().method();

    if (method === 'POST' && path === '/backend/v3/api/catalog/products') {
      await created(PRODUCT);
      return;
    }
    if (method === 'POST' && path === '/backend/v3/api/inventory/stocks/s-1/adjustments') {
      await created(STOCK);
      return;
    }
    if (method === 'POST' && path === '/backend/v3/api/carriers') {
      await created(CARRIER);
      return;
    }
    if (method === 'POST' && path === '/backend/v3/api/shipments/sh-1/tracking_events') {
      await created(TRACKING_EVENT);
      return;
    }
    if (method === 'POST' && path === '/backend/v3/api/catalog/media') {
      await created(MEDIA_ITEM);
      return;
    }
    if (method === 'POST' && path === '/backend/v3/api/shipments') {
      await created(CREATED_SHIPMENT);
      return;
    }
    if (path === '/backend/v3/api/fulfillments') {
      await fulfill({ items: [FULFILLMENT], pageInfo: pageInfo(200, 1) });
      return;
    }

    if (path === '/app/v3/api/auth/sessions/current') {
      await fulfill(buildAdminSession());
      return;
    }
    if (path === '/backend/v3/api/catalog/products') {
      await fulfill({ items: [PRODUCT], pageInfo: pageInfo(20, 1) });
      return;
    }
    if (path === '/backend/v3/api/catalog/products/p-1') {
      await fulfill({ item: PRODUCT });
      return;
    }
    if (path === '/backend/v3/api/catalog/categories') {
      if (requestUrl.searchParams.get('root_only') === 'true') {
        await fulfill({ items: CATEGORY_ROOTS, pageInfo: pageInfo(200, CATEGORY_ROOTS.length) });
        return;
      }
      if (requestUrl.searchParams.get('parent_id') === 'c-1') {
        await fulfill({ items: CATEGORY_CHILDREN, pageInfo: pageInfo(200, CATEGORY_CHILDREN.length) });
        return;
      }
      await fulfill({ items: CATEGORY_ROOTS, pageInfo: pageInfo(200, CATEGORY_ROOTS.length) });
      return;
    }
    if (path === '/backend/v3/api/catalog/category_attributes') {
      await fulfill({ items: [CATEGORY_ATTRIBUTE], pageInfo: pageInfo(200, 1) });
      return;
    }
    if (path === '/backend/v3/api/catalog/attributes') {
      await fulfill({ items: [ATTRIBUTE], pageInfo: pageInfo(200, 1) });
      return;
    }
    if (path === '/backend/v3/api/catalog/attributes/a-1/values') {
      await fulfill({ items: [ATTRIBUTE_VALUE], pageInfo: pageInfo(200, 1) });
      return;
    }
    if (path === '/backend/v3/api/catalog/skus') {
      await fulfill({ items: [SKU], pageInfo: pageInfo(100, 1) });
      return;
    }
    if (path === '/backend/v3/api/catalog/media') {
      await emptyPage();
      return;
    }
    if (method === 'DELETE' && path === '/backend/v3/api/catalog/skus/sku-1') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (path === '/backend/v3/api/catalog/brands') {
      await emptyPage();
      return;
    }
    if (path === '/backend/v3/api/catalog/price_lists') {
      await fulfill({ items: [PRICE_LIST], pageInfo: pageInfo(20, 1) });
      return;
    }
    if (path === '/backend/v3/api/inventory/stocks') {
      await fulfill({ items: [STOCK], pageInfo: pageInfo(20, 1) });
      return;
    }
    if (path === '/backend/v3/api/inventory/movements' || path === '/backend/v3/api/inventory/reservations') {
      await emptyPage();
      return;
    }
    if (path === '/backend/v3/api/carriers') {
      await fulfill({ items: [CARRIER], pageInfo: pageInfo(20, 1) });
      return;
    }
    if (path === '/backend/v3/api/shipments') {
      await fulfill({ items: [SHIPMENT], pageInfo: pageInfo(20, 1) });
      return;
    }
    if (path === '/backend/v3/api/shipments/sh-1/tracking_events') {
      await fulfill({ items: [TRACKING_EVENT], pageInfo: pageInfo(100, 1) });
      return;
    }
    if (path.startsWith('/app/v3/api/') || path.startsWith('/backend/v3/api/')) {
      await emptyPage();
      return;
    }
    await route.continue();
  });
}

test.describe('product center admin', () => {
  test('opens the product center module from the admin header', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);

    await page.goto('/admin/products');
    const header = page.locator('header');
    await expect(header.getByRole('button', { name: /商品中心|Product Center/u })).toBeVisible();
    await expect(page.getByRole('heading').first()).toBeVisible();

    // Metric cards navigate inside the SPA through the host-injected router.
    await page.locator('a[href="/admin/products/list"]').first().click();
    await expect(page).toHaveURL(/\/admin\/products\/list$/u);
    await expect(page.getByText('P-1')).toBeVisible();
  });

  test('lists catalog products from the owning module', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);

    await page.goto('/admin/products/list');
    await expect(page.getByText('P-1')).toBeVisible();
    await expect(page.getByText('Router').first()).toBeVisible();
  });

  test('loads the category tree one level at a time', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);

    const categoryRequests: URL[] = [];
    page.on('request', (request) => {
      const requestUrl = new URL(request.url());
      if (requestUrl.pathname === '/backend/v3/api/catalog/categories') {
        categoryRequests.push(requestUrl);
      }
    });

    await page.goto('/admin/products/category-tree');
    await expect(page.getByRole('heading', { name: /分类树|Category Tree/u })).toBeVisible();
    await expect(page.getByText('Routers', { exact: true })).toBeVisible();
    await expect(page.getByText('Accessories', { exact: true })).toBeVisible();
    // Aligned with the Application Center taxonomy manager: five columns, a
    // depth hint and per-level create actions.
    await expect(page.getByText('一级分类', { exact: true })).toBeVisible();
    await expect(page.getByText('最多支持 5 级分类。')).toBeVisible();
    await expect(page.getByRole('button', { name: '新建一级分类' })).toBeVisible();
    await expect(page.getByRole('button', { name: '新建下级分类 Routers' })).toBeVisible();
    expect(categoryRequests.some((url) => url.searchParams.get('root_only') === 'true')).toBe(true);
    expect(categoryRequests.some((url) => url.searchParams.has('parent_id'))).toBe(false);

    await page.getByText('Routers', { exact: true }).click();
    await expect(page.getByText('Mesh routers', { exact: true })).toBeVisible();
    expect(categoryRequests.some((url) => url.searchParams.get('parent_id') === 'c-1')).toBe(true);
  });

  test('lists carriers and shows the carrier name on the logistics board', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);

    await page.goto('/admin/products/carriers');
    await expect(page.getByText('SF Express')).toBeVisible();

    await page.goto('/admin/products/logistics');
    await expect(page.getByText('SH-2026-1')).toBeVisible();
    await expect(page.getByText(/SF Express \(sf\)/u)).toBeVisible();
  });

  test('opens the shipment tracking timeline dialog', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);

    await page.goto('/admin/products/shipments');
    await expect(page.getByText('SH-2026-1')).toBeVisible();

    await page.getByRole('button', { name: /物流轨迹|Tracking/u }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('TE-1')).toBeVisible();
  });

  test('renders the product detail attributes and SKU matrix', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);

    await page.goto('/admin/products/p-1');
    await expect(page.getByText('Router Pro').first()).toBeVisible();
    await expect(page.getByText('Colour').first()).toBeVisible();
    await expect(page.getByText('P-1-01').first()).toBeVisible();

    // The Drive upload entry renders inside the media panel; the upload itself
    // calls Drive, which this environment does not run.
    await page.getByRole('button', { name: /上传媒体|上传图片|Upload media|Upload image/u }).first().click();
    await expect(
      page.getByRole('dialog').filter({ hasText: /上传商品媒体|Upload product media/u }),
    ).toBeVisible();
  });

  test('lists price lists and the attribute dictionary', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);

    await page.goto('/admin/products/pricing');
    await expect(page.getByText('Retail CNY')).toBeVisible();

    await page.goto('/admin/products/attributes');
    await expect(page.getByText('Colour').first()).toBeVisible();
  });

  test('lists inventory stocks from the inventory module', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);

    await page.goto('/admin/products/inventory');
    await expect(page.getByText('sku-1').first()).toBeVisible();
  });

  test('creates a product through the generated catalog SDK', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);
    const writes = captureWrites(page);

    await page.goto('/admin/products/list');
    await page.getByRole('button', { name: /新建|新增|Create/u }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input').nth(0).fill('P-E2E');
    await dialog.locator('input').nth(1).fill('E2E Router');
    await dialog.getByRole('button', { name: /保存|Save/u }).click();

    const write = await waitForWrite(writes, 'POST', '/backend/v3/api/catalog/products');
    expect(write.body).toContain('"productNo":"P-E2E"');
    expect(write.body).toContain('"title":"E2E Router"');
  });

  test('records a stock movement with the int64 quantity delta as a string', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);
    const writes = captureWrites(page);

    await page.goto('/admin/products/inventory');
    await page.getByRole('button', { name: /库存变动|Stock movement/u }).first().click();
    const dialog = page.getByRole('dialog');
    // The default movement is a stocktake: the counted quantity (15) against the
    // current available quantity (10) must be submitted as the int64 string "+5".
    await dialog.locator('input[type="number"]').last().fill('15');
    await dialog.getByRole('button', { name: /保存|Save/u }).click();

    const write = await waitForWrite(
      writes,
      'POST',
      '/backend/v3/api/inventory/stocks/s-1/adjustments',
    );
    expect(write.body).toContain('"quantityDelta":"5"');
    expect(write.body).toContain('"movementType":"stocktake"');
    expect(write.idempotencyKey).not.toBe('');
  });

  test('records a shipment tracking event with an idempotency key', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);
    const writes = captureWrites(page);

    await page.goto('/admin/products/shipments');
    await page.getByRole('button', { name: /物流轨迹|Tracking/u }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /登记轨迹事件|Record tracking event/u }).click();
    const form = page.getByRole('dialog').last();
    await form.locator('input').last().fill('Shanghai hub');
    await form.getByRole('button', { name: /保存|Save/u }).click();

    const write = await waitForWrite(
      writes,
      'POST',
      '/backend/v3/api/shipments/sh-1/tracking_events',
    );
    expect(write.body).toContain('"eventType"');
    expect(write.body).toContain('Shanghai hub');
    expect(write.idempotencyKey).not.toBe('');
  });

  test('creates a carrier with the normalized code and an idempotency key', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);
    const writes = captureWrites(page);

    await page.goto('/admin/products/carriers');
    await page.getByRole('button', { name: /新建承运商|Create carrier/u }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input').nth(0).fill('SF-E2E');
    await dialog.locator('input').nth(1).fill('E2E Express');
    await dialog.getByRole('button', { name: /保存|Save/u }).click();

    const write = await waitForWrite(writes, 'POST', '/backend/v3/api/carriers');
    expect(write.body).toContain('"carrierCode":"sf-e2e"');
    expect(write.body).toContain('"carrierName":"E2E Express"');
    expect(write.idempotencyKey).not.toBe('');
  });

  test('registers external media with a numeric int64 resource identity', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);
    const writes = captureWrites(page);

    await page.goto('/admin/products/p-1');
    await expect(page.getByText('Router Pro').first()).toBeVisible();
    await page.getByRole('button', { name: /新增媒体|Add media/u }).first().click();
    const dialog = page.getByRole('dialog').last();
    await dialog.locator('input').first().fill('https://cdn.example.com/product/main.jpg');
    await dialog.getByRole('button', { name: /保存|Save/u }).click();

    const write = await waitForWrite(writes, 'POST', '/backend/v3/api/catalog/media');
    const body = JSON.parse(write.body) as {
      resource?: { id?: string; source?: string; url?: string };
      ownerType?: string;
    };
    expect(body.ownerType).toBe('spu');
    expect(body.resource?.source).toBe('external_url');
    // The owning module requires MediaResource.id to be a positive int64 string.
    expect(body.resource?.id).toMatch(/^[0-9]+$/u);
    expect(BigInt(body.resource?.id ?? '0') < 9223372036854775808n).toBe(true);
  });

  test('creates a shipment from a fulfillment with an idempotency key', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);
    const writes = captureWrites(page);

    await page.goto('/admin/products/shipments');
    await expect(page.getByText('SH-2026-1')).toBeVisible();
    await page.getByRole('button', { name: /新建|新增|Create/u }).first().click();
    const dialog = page.getByRole('dialog');
    // Fulfillment and carrier are selects once their lookups have loaded.
    await expect(dialog.locator('select')).toHaveCount(2);
    await dialog.locator('input').last().fill('SF-E2E-1');
    await dialog.getByRole('button', { name: /保存|Save/u }).click();

    const write = await waitForWrite(writes, 'POST', '/backend/v3/api/shipments');
    const body = JSON.parse(write.body) as {
      fulfillmentId?: string;
      carrierCode?: string;
      trackingNo?: string;
    };
    expect(body.fulfillmentId).toBe('f-1');
    expect(body.carrierCode).toBe('sf');
    expect(body.trackingNo).toBe('SF-E2E-1');
    expect(write.idempotencyKey).not.toBe('');
  });

  test('deletes a SKU after confirmation with the If-Match version', async ({ page }) => {
    await seedAdminSession(page);
    await mockProductCenterApi(page);
    const writes = captureWrites(page);

    await page.goto('/admin/products/skus');
    await expect(page.getByText('P-1-01')).toBeVisible();
    await page.getByRole('button', { name: /^删除$|^Delete$/u }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/删除 SKU|Delete SKU/u)).toBeVisible();
    await dialog.getByRole('button', { name: /^删除$|^Delete$/u }).click();

    const write = await waitForWrite(writes, 'DELETE', '/backend/v3/api/catalog/skus/sku-1');
    expect(write.ifMatch).toBe('1');
    // The list reloads after the delete; the mock still returns the row.
    await expect(page.getByText('P-1-01')).toBeVisible();
  });
});
