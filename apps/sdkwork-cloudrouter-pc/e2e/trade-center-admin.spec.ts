import { expect, test, type Page } from '@playwright/test';

const PERMISSION_SCOPE = [
  'cloudrouter.admin.access',
  'cloudrouter.console.access',
  'cloudrouter.system.read',
  'commerce.orders.read',
  'commerce.orders.manage',
  'commerce.orders.review',
];

function buildAdminSession(): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1_000);
  return {
    accessToken: 'e2e-access-token',
    authToken: 'e2e-auth-token',
    refreshToken: 'e2e-refresh-token',
    sessionId: 'trade-session',
    expiresAt: now + 3_600,
    storedAt: now,
    context: {
      tenantId: '100001',
      organizationId: '0',
      userId: 'trade-admin',
      sessionId: 'trade-session',
      appId: 'sdkwork-cloudrouter',
      environment: 'dev',
      deploymentMode: 'standalone',
      authLevel: 'password',
      permissionScope: PERMISSION_SCOPE,
      standardRoleCodes: ['backend-root-admin'],
    },
  };
}

const ORDER_ITEMS = [
  {
    id: 'item-1',
    orderId: 'order-1',
    productName: 'Token Bank 100',
    quantity: '1',
    unitPrice: '99.00',
    totalAmount: '99.00',
  },
];

const ORDER = {
  orderId: 'order-1',
  orderSn: 'ORDER-2026-1',
  status: 'paid',
  statusName: 'Paid',
  subject: 'Token Bank 100',
  totalAmount: '99.00',
  paidAmount: '99.00',
  discountAmount: '0.00',
  quantity: '1',
  createdAt: '2026-07-18T00:00:00.000Z',
  payTime: '2026-07-18T00:05:00.000Z',
  paymentMethod: 'wallet',
  items: ORDER_ITEMS,
  outTradeNo: 'OUT-1',
  transactionId: 'TXN-1',
};

const SHIPMENT = {
  shipmentId: 'sh-1',
  shipmentNo: 'SH-2026-1',
  fulfillmentId: 'f-1',
  carrierCode: 'sf',
  trackingNo: 'SF123456',
  status: 'shipped',
};

const AFTER_SALES = {
  afterSalesRequestId: 'as-1',
  afterSalesNo: 'AS-2026-1',
  orderId: 'order-1',
  afterSalesType: 'refund',
  reasonCode: 'quality',
  requestedAmount: '99.00',
  currencyCode: 'CNY',
  status: 'submitted',
};

const REFUND = {
  accountValueRequestId: 'rf-1',
  requestNo: 'RF-2026-1',
  originalOrderId: 'order-1',
  ownerUserId: 'u-1',
  subject: 'Token refund',
  targetAsset: 'token_bank',
  amount: '50.00',
  currencyCode: 'CNY',
  status: 'pending',
  createdAt: '2026-07-18T00:00:00.000Z',
  updatedAt: '2026-07-18T00:00:00.000Z',
};

const WITHDRAWAL = {
  accountValueRequestId: 'wd-1',
  requestNo: 'WD-2026-1',
  ownerUserId: 'u-2',
  subject: 'Cash withdrawal',
  targetAsset: 'cash',
  amount: '200.00',
  currencyCode: 'CNY',
  status: 'pending',
  createdAt: '2026-07-18T00:00:00.000Z',
  updatedAt: '2026-07-18T00:00:00.000Z',
};

async function seedAdminSession(page: Page): Promise<void> {
  await page.addInitScript((session) => {
    localStorage.setItem('sdkwork.cloudRouter.appSession.v1', JSON.stringify(session));
    localStorage.setItem('user_explicit_lang', 'zh-CN');
  }, buildAdminSession());
}

async function mockOrderApi(page: Page, session: Record<string, unknown> = buildAdminSession()): Promise<void> {
  await page.route('**/*', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const fulfill = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data }),
    });

    if (path === '/app/v3/api/auth/sessions/current') {
      await fulfill(session);
      return;
    }
    if (path === '/backend/v3/api/orders') {
      await fulfill({ items: [ORDER], pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
      return;
    }
    if (path === '/backend/v3/api/orders/order-1') {
      await fulfill(ORDER);
      return;
    }
    if (path === '/backend/v3/api/orders/order-1/events') {
      await fulfill({
        items: [
          { id: 'ev-2', eventType: 'order.paid', fromStatus: 'pending_payment', toStatus: 'paid', actorType: 'system', message: 'Payment confirmed', createdAt: '2026-07-18T00:05:00.000Z' },
          { id: 'ev-1', eventType: 'order.created', fromStatus: null, toStatus: 'pending_payment', actorType: 'buyer', message: 'Order created', createdAt: '2026-07-18T00:00:00.000Z' },
        ],
        pageInfo: { mode: 'offset', page: 1, pageSize: 100, totalItems: 2, totalPages: 1 },
      });
      return;
    }
    if (path === '/backend/v3/api/shipments' && new URL(route.request().url()).searchParams.get('order_id') === 'order-1') {
      await fulfill({ items: [SHIPMENT], pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
      return;
    }
    if (path === '/backend/v3/api/shipments') {
      await fulfill({ items: [SHIPMENT], pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
      return;
    }
    if (path === '/backend/v3/api/after_sales/requests') {
      await fulfill({ items: [AFTER_SALES], pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
      return;
    }
    if (path === '/backend/v3/api/refund_requests') {
      await fulfill({ items: [REFUND], pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
      return;
    }
    if (path === '/backend/v3/api/withdrawal_requests') {
      await fulfill({ items: [WITHDRAWAL], pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
      return;
    }
    if (path.startsWith('/app/v3/api/') || path.startsWith('/backend/v3/api/')) {
      await fulfill({});
      return;
    }
    await route.continue();
  });
}

test.describe('trading center admin', () => {
  test('renders the workbench with pending counts and quick entries', async ({ page }) => {
    await seedAdminSession(page);
    await mockOrderApi(page);

    await page.goto('/admin/trade/overview');
    await expect(page.getByRole('heading', { name: '交易中心工作台' })).toBeVisible();
    await expect(page.getByText('待审核售后')).toBeVisible();
    await expect(page.getByText('待审核退款')).toBeVisible();
    await expect(page.getByText('待审核提现')).toBeVisible();
    await expect(page.getByText('待发货')).toBeVisible();
    await expect(page.getByLabel('交易中心工作台').getByRole('link', { name: '全部订单' })).toBeVisible();
    await expect(page.getByText('Token Bank 100')).toBeVisible();

    // Header module entry exists for the trading center.
    const header = page.locator('header');
    await expect(header.getByRole('button', { name: '交易中心' })).toBeVisible();
  });

  test('lists orders and opens the enhanced detail drawer', async ({ page }) => {
    await seedAdminSession(page);
    await mockOrderApi(page);

    await page.goto('/admin/trade/orders');
    await expect(page.getByText('ORDER-2026-1')).toBeVisible();

    await page.getByRole('button', { name: /详情/u }).click();
    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog.getByRole('heading', { name: '订单详情' })).toBeVisible();
    await expect(detailDialog.getByText('Token Bank 100')).toBeVisible();
    await expect(detailDialog.getByText('履约信息')).toBeVisible();
    await expect(detailDialog.getByText('SH-2026-1')).toBeVisible();
    await expect(detailDialog.getByText('订单时间线')).toBeVisible();
    await expect(detailDialog.getByText('Payment confirmed')).toBeVisible();
  });

  test('navigates after-sales, shipments, refunds, and withdrawals screens', async ({ page }) => {
    await seedAdminSession(page);
    await mockOrderApi(page);

    await page.goto('/admin/trade/after-sales');
    await expect(page.getByText('AS-2026-1')).toBeVisible();

    await page.goto('/admin/trade/shipments');
    await expect(page.getByText('SH-2026-1')).toBeVisible();

    await page.goto('/admin/trade/refunds');
    await expect(page.getByText('RF-2026-1')).toBeVisible();

    await page.goto('/admin/trade/withdrawals');
    await expect(page.getByText('WD-2026-1')).toBeVisible();
  });

  test('read-only operators see lists but no manage or review actions', async ({ page }) => {
    const now = Math.floor(Date.now() / 1_000);
    const readOnlySession = {
      ...buildAdminSession(),
      context: {
        ...buildAdminSession().context,
        permissionScope: ['cloudrouter.admin.access', 'cloudrouter.console.access', 'commerce.orders.read'],
      },
      expiresAt: now + 3_600,
      storedAt: now,
    };
    await page.addInitScript((session) => {
      localStorage.setItem('sdkwork.cloudRouter.appSession.v1', JSON.stringify(session));
      localStorage.setItem('user_explicit_lang', 'zh-CN');
    }, readOnlySession);
    await mockOrderApi(page, readOnlySession);

    await page.goto('/admin/trade/orders');
    await expect(page.getByText('ORDER-2026-1')).toBeVisible();
    await expect(page.getByRole('button', { name: '取消' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '关闭' })).toHaveCount(0);

    await page.goto('/admin/trade/after-sales');
    await expect(page.getByText('AS-2026-1')).toBeVisible();
    await expect(page.getByRole('button', { name: /审核/u })).toHaveCount(0);

    await page.goto('/admin/trade/refunds');
    await expect(page.getByText('RF-2026-1')).toBeVisible();
    await expect(page.getByRole('button', { name: /审核/u })).toHaveCount(0);
  });

  test('renders trading center copy in English when the portal language is en-US', async ({ page }) => {
    await page.addInitScript((session) => {
      localStorage.setItem('sdkwork.cloudRouter.appSession.v1', JSON.stringify(session));
      localStorage.setItem('user_explicit_lang', 'en');
    }, buildAdminSession());
    await mockOrderApi(page);

    await page.goto('/admin/trade/overview');
    await expect(page.getByRole('heading', { name: 'Trading Center Workbench' })).toBeVisible();
    await expect(page.getByText('Refunds to review')).toBeVisible();
    await expect(page.getByText('Shipments pending dispatch')).toBeVisible();

    await page.goto('/admin/trade/orders');
    await expect(page.getByText('ORDER-2026-1')).toBeVisible();
    await expect(page.getByRole('button', { name: /Details/u }).first()).toBeVisible();
  });
});
