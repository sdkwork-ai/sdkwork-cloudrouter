import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * 营销中心分页回归：
 *
 * 底部只允许存在**一条**分页行——总行数在左，每页行数/页码/翻页/跳页在右。
 * 历史缺陷把页码跳转条渲染成 `AdminTableShell.footer` 里的第二个块级兄弟节点，
 * 于是每个营销列表页底部都恒定出现两行分页（与窗口宽度无关）。
 *
 * 该用例遍历营销中心全部路由，断言：
 * 1. footer 只有一个子节点（不存在第二条分页条）；
 * 2. 分页区内所有可见控件落在同一水平线上（单行）；
 * 3. 跳页控件存在且位于该行内；
 * 4. 不存在横向溢出（控件没有被裁切）。
 */

const ROUTES = [
  { path: '/admin/marketing/campaigns', name: 'campaigns' },
  { path: '/admin/marketing/promotionOffers', name: 'promotion offers' },
  { path: '/admin/marketing/promotionCouponStocks', name: 'coupon stocks' },
  { path: '/admin/marketing/codeBatches', name: 'code batches' },
  { path: '/admin/marketing/codeBatches/batch-1', name: 'batch codes' },
  { path: '/admin/marketing/promotionCodes', name: 'promotion codes' },
  { path: '/admin/marketing/userCoupons', name: 'user coupons' },
  { path: '/admin/marketing/discountApplications', name: 'discount applications' },
  { path: '/admin/marketing/redemptionAttempts', name: 'redemption attempts' },
  { path: '/admin/marketing/distributionTasks', name: 'distribution tasks' },
  { path: '/admin/marketing/promotionCouponLedger', name: 'coupon ledger' },
  { path: '/admin/marketing/referralStrategies', name: 'referral strategies' },
  { path: '/admin/marketing/referrals', name: 'referral stats' },
  { path: '/admin/marketing/referralRelations', name: 'referral relations' },
] as const;

/** 报表页没有表格分页；它用于证明「营销中心不是每一页都该有分页条」。 */
const REPORT_ROUTE = '/admin/marketing/reports';

const VIEWPORTS = [
  { width: 1708, height: 960, label: 'wide desktop' },
  { width: 1280, height: 900, label: 'laptop' },
] as const;

const PERMISSION_SCOPE = [
  'cloudrouter.admin.access',
  'cloudrouter.console.access',
  'cloudrouter.system.read',
  'commerce.marketing.read',
  'commerce.marketing.manage',
];

function buildAdminSession(): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1_000);
  return {
    accessToken: 'e2e-access-token',
    authToken: 'e2e-auth-token',
    refreshToken: 'e2e-refresh-token',
    sessionId: 'marketing-pagination-session',
    expiresAt: now + 3_600,
    storedAt: now,
    context: {
      tenantId: '100001',
      organizationId: '0',
      userId: 'marketing-pagination-admin',
      sessionId: 'marketing-pagination-session',
      appId: 'sdkwork-cloudrouter',
      environment: 'dev',
      deploymentMode: 'standalone',
      authLevel: 'password',
      permissionScope: PERMISSION_SCOPE,
      standardRoleCodes: ['backend-root-admin'],
    },
  };
}

const LIST_ITEMS = Array.from({ length: 5 }, (_, index) => ({
  id: `sample-${index + 1}`,
  status: 'active',
  createdAt: '2026-11-10 09:12:00',
  updatedAt: '2026-11-10 09:12:00',
  startsAt: '2026-11-01 00:00:00',
  endsAt: '2026-12-01 00:00:00',
}));

const LIST_PAGE_INFO = {
  mode: 'offset',
  page: '1',
  pageSize: '20',
  totalItems: '100',
  totalPages: '5',
  hasMore: true,
};

/**
 * 邀请模块的列表项必须通过 `marketingService` 的严格归一化（缺字段会整页报错），
 * 因此这里给出行内字段完整的最小记录，保证页面像真实数据一样渲染出行与总行数。
 */
const REFERRAL_STAT_ITEMS = [{
  id: 'referral-stat-1',
  inviter: 'user-1',
  totalInvited: '5',
  totalRevenue: '100.00',
  bonusAwarded: '10.00',
  link: 'https://example.com/invite/ABC123',
}];

const REFERRAL_RELATION_ITEMS = [{
  id: 'referral-relation-1',
  inviter: 'user-1',
  invitee: 'user-2',
  inviteCode: 'ABC123',
  source: 'register',
  rewardStatus: 'granted',
  claimedAt: '2026-11-10T09:12:00Z',
}];

const REFERRAL_STRATEGY_ITEMS = [{
  id: 'referral-strategy-1',
  name: 'Invite friends',
  description: 'Reward inviters for successful registrations',
  status: 'active',
  rewardType: 'POINTS',
  rewardValue: '100',
  rewardTarget: 'INVITER',
  triggerEvent: 'referral.registered',
  maxRewardsPerInviter: '10',
  startsAt: '2026-11-01T00:00:00Z',
  endsAt: '2026-12-01T00:00:00Z',
  updatedAt: '2026-11-10T09:12:00Z',
}];

const REPORT = {
  from: '2026-10-17T00:00:00.000Z',
  to: '2026-11-16T00:00:00.000Z',
  counts: {
    issuedCodes: '10',
    claimedCoupons: '5',
    redeemedCoupons: '3',
    expiredCoupons: '0',
    voidedCoupons: '0',
    disabledCodes: '0',
    applicationsApplied: '2',
    applicationsSettled: '2',
    applicationsReleased: '0',
  },
  rates: { claimRateBp: '5000', redemptionRateBp: '3000', voidRateBp: '0' },
  byCurrency: [],
  topOffers: [],
};

async function mockMarketingApi(page: Page): Promise<void> {
  await page.addInitScript((session) => {
    localStorage.setItem('sdkwork.cloudRouter.appSession.v1', JSON.stringify(session));
    localStorage.setItem('user_explicit_lang', 'zh-CN');
  }, buildAdminSession());

  await page.route('**/*', async (route: Route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;
    const fulfill = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data, traceId: 'trace-marketing-pagination' }),
    });

    if (path === '/app/v3/api/auth/sessions/current') {
      await fulfill(buildAdminSession());
      return;
    }
    if (path === '/backend/v3/api/promotions/reports') {
      await fulfill(REPORT);
      return;
    }
    if (path === '/backend/v3/api/billing/referrals/stats') {
      await fulfill({ items: REFERRAL_STAT_ITEMS, pageInfo: LIST_PAGE_INFO });
      return;
    }
    if (path === '/backend/v3/api/billing/referrals/relations') {
      await fulfill({ items: REFERRAL_RELATION_ITEMS, pageInfo: LIST_PAGE_INFO });
      return;
    }
    if (path === '/backend/v3/api/billing/referral_strategies') {
      await fulfill({ items: REFERRAL_STRATEGY_ITEMS, pageInfo: LIST_PAGE_INFO });
      return;
    }
    if (path.startsWith('/backend/v3/api/') || path.startsWith('/app/v3/api/')) {
      const isList = route.request().method() === 'GET'
        && (requestUrl.searchParams.has('page') || /s\/?$/u.test(path));
      await fulfill(isList ? { items: LIST_ITEMS, pageInfo: LIST_PAGE_INFO } : {});
      return;
    }
    await route.continue();
  });
}

interface PaginationRowReport {
  hasFooter: boolean;
  rowCount: number;
  clusterCount: number;
  visualLineCount: number;
  hasJumpControl: boolean;
  pageSizeSelectCount: number;
  horizontalOverflow: number;
  footerText: string;
}

/** 读取底部 footer 的几何信息：子节点数量、可视行数、控件存在性与溢出。 */
async function readPaginationRow(page: Page): Promise<PaginationRowReport> {
  return page.evaluate((): PaginationRowReport => {
    const footer = document.querySelector('[data-admin-table-shell-footer]');
    if (!footer) {
      return {
        hasFooter: false,
        rowCount: 0,
        clusterCount: 0,
        visualLineCount: 0,
        hasJumpControl: false,
        pageSizeSelectCount: 0,
        horizontalOverflow: 0,
        footerText: '',
      };
    }
    const row = footer.children[0];
    const rowRect = row instanceof HTMLElement ? row.getBoundingClientRect() : null;
    // 可见控件的垂直中心按 6px 容差聚簇：同一行内不同高度的控件中心相同。
    const centers: number[] = [];
    footer.querySelectorAll('*').forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.height > 48) {
        return;
      }
      centers.push(rect.top + rect.height / 2);
    });
    centers.sort((left, right) => left - right);
    const lines: number[] = [];
    for (const center of centers) {
      if (lines.length === 0 || Math.abs(center - lines[lines.length - 1]) > 6) {
        lines.push(center);
      }
    }
    return {
      hasFooter: true,
      rowCount: footer.children.length,
      clusterCount: row ? row.children.length : 0,
      visualLineCount: lines.length,
      hasJumpControl: footer.querySelector('form input[type="number"]') !== null,
      pageSizeSelectCount: footer.querySelectorAll('select').length,
      horizontalOverflow: row instanceof HTMLElement ? row.scrollWidth - row.clientWidth : 0,
      footerText: (footer.textContent ?? '').replace(/\s+/gu, ' ').trim(),
    };
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(`marketing center pagination — ${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test.setTimeout(120_000);

    for (const route of ROUTES) {
      test(`${route.name} keeps a single pagination row`, async ({ page }) => {
        await mockMarketingApi(page);
        // 门户挂有长连接/轮询请求，`load` 不会及时触发；布局断言只需 DOM 就绪。
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });

        const footer = page.locator('[data-admin-table-shell-footer]');
        await expect(footer).toBeVisible({ timeout: 60_000 });

        const report = await readPaginationRow(page);

        // 第二条分页条不存在：footer 只承载唯一的分页行。
        expect(report.rowCount, `footer of ${route.path} must render exactly one row`).toBe(1);
        expect(report.visualLineCount, `controls of ${route.path} must share one line`).toBe(1);
        expect(report.clusterCount, `row of ${route.path} keeps summary + controls`).toBeGreaterThanOrEqual(2);
        expect(report.pageSizeSelectCount, `page-size select of ${route.path}`).toBe(1);
        expect(report.hasJumpControl, `page-jump control of ${route.path}`).toBe(true);
        expect(report.horizontalOverflow, `no clipped controls in ${route.path}`).toBeLessThanOrEqual(0);

        // 行数统计与跳页控件同处一行：总行数来自 pageInfo.totalItems。
        await expect(footer).toContainText('共 100 行');
        await expect(footer.getByRole('spinbutton')).toBeVisible();
        await expect(footer.getByRole('button', { name: /跳转|Go/u })).toBeVisible();
        await expect(page.locator('[data-admin-table-shell-footer] > *')).toHaveCount(1);
      });
    }

    test('report page renders no bottom pagination bar', async ({ page }) => {
      await mockMarketingApi(page);
      await page.goto(REPORT_ROUTE, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h2').first()).toBeVisible({ timeout: 60_000 });
      await expect(page.locator('[data-admin-table-shell-footer]')).toHaveCount(0);
    });
  });
}
