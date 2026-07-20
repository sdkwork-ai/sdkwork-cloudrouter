import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const PERMISSION_SCOPE = [
  'clawrouter.admin.access',
  'clawrouter.console.access',
  'clawrouter.system.read',
  'clawrouter.gateway.read',
  'clawrouter.gateway.manage',
  'iam.users.read',
  'iam.organizations.read',
  'iam.roles.read',
  'iam.permissions.read',
  'iam.oauth.read',
];

const DASHBOARD_DATA = {
  activeUsers: 23,
  userConsumption: [
    { name: 'Platform team', value: 560, color: '#2563eb' },
    { name: 'Research team', value: 340, color: '#7c3aed' },
  ],
  multimodal: [
    { name: 'Text', value: 68, color: '#2563eb' },
    { name: 'Vision', value: 21, color: '#7c3aed' },
    { name: 'Audio', value: 11, color: '#0891b2' },
  ],
  traffic: [
    { time: 'Today', tokens: 910_000, requests: 741, cost: 1_260 },
  ],
  modelDistribution: [
    { name: 'gpt-5', value: 44, color: '#2563eb' },
    { name: 'claude-sonnet', value: 31, color: '#7c3aed' },
  ],
  recentUsage: [
    {
      id: 'trace-1',
      user: 'platform-api',
      isApiUser: true,
      model: 'gpt-5',
      type: 'text',
      billingMode: 'token',
      usageIn: 12_500,
      usageOut: 2_400,
      time: '2026-07-20 17:22:09',
      status: 'success',
      cost: '2.43',
    },
  ],
};

const ANALYTICS_DATA = {
  summary: {
    totalUsers: 56,
    activeUsers: 23,
    activeModels: 7,
    totalRequests: 741,
    successfulRequests: 726,
    failedRequests: 15,
    totalTokens: 910_000,
    totalPoints: 1_260.5,
    upstreamCost: 184.72,
    averageTokensPerRequest: 1_228.07,
    averagePointsPerRequest: 1.7,
    errorRate: 2,
  },
  trend: [
    { time: 'D-1', requests: 715, tokens: 870_000, points: 1_205, users: 22 },
    { time: 'Today', requests: 741, tokens: 910_000, points: 1_260.5, users: 23 },
  ],
};

const INSTALLATION_DATA = {
  status: 'installed',
  schemaVersion: '3',
  catalogVersion: '2026.07',
  catalogSource: 'bundled',
  externalCatalog: false,
  lastCatalogRefreshStatus: 'success',
  environment: 'development',
  seedProfile: 'standard',
  changed: false,
};

async function prepareAdminDashboard(page: Page): Promise<void> {
  const now = Math.floor(Date.now() / 1_000);
  const session = {
    accessToken: 'visual-access-token',
    authToken: 'visual-auth-token',
    refreshToken: 'visual-refresh-token',
    sessionId: 'visual-session',
    expiresAt: now + 3_600,
    storedAt: now,
    context: {
      tenantId: '100001',
      organizationId: '0',
      userId: 'visual-admin',
      sessionId: 'visual-session',
      appId: 'sdkwork-clawrouter',
      environment: 'dev',
      deploymentMode: 'standalone',
      authLevel: 'password',
      permissionScope: PERMISSION_SCOPE,
      standardRoleCodes: ['backend-root-admin'],
    },
  };

  await page.addInitScript((storedSession) => {
    localStorage.setItem('sdkwork.clawRouter.appSession.v1', JSON.stringify(storedSession));
    localStorage.setItem('user_explicit_lang', 'en');
  }, session);

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
    if (path === '/backend/v3/api/system/dashboard/admin/overview') {
      await fulfill(DASHBOARD_DATA);
      return;
    }
    if (path === '/backend/v3/api/system/analytics/admin/overview') {
      await fulfill(ANALYTICS_DATA);
      return;
    }
    if (path === '/backend/v3/api/system/installation/status') {
      await fulfill(INSTALLATION_DATA);
      return;
    }
    if (path.startsWith('/app/v3/api/') || path.startsWith('/backend/v3/api/')) {
      await fulfill({});
      return;
    }
    await route.continue();
  });
}

async function captureVisual(page: Page, fileName: string): Promise<void> {
  const outputRoot = process.env.PLAYWRIGHT_VISUAL_OUTPUT_ROOT?.trim();
  if (!outputRoot) {
    return;
  }
  await page.screenshot({
    path: path.join(outputRoot, fileName),
    fullPage: false,
  });
}

test.describe('Admin dashboard responsive shell', () => {
  test('renders a dense desktop dashboard with a non-empty trend chart', async ({ page }) => {
    await page.setViewportSize({ width: 1_440, height: 1_000 });
    await prepareAdminDashboard(page);
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Operations Overview' })).toBeVisible();
    await expect(page.locator('[data-admin-desktop-sidebar]')).toBeVisible();
    await expect(page.getByText('Points Consumed', { exact: true })).toBeVisible();
    await expect(page.getByText('$184.72', { exact: true })).toBeVisible();

    const trendSvg = page.locator('.recharts-responsive-container svg').first();
    await expect(trendSvg).toBeVisible();
    await expect.poll(async () => (await trendSvg.boundingBox())?.height ?? 0).toBeGreaterThan(250);
    await expect.poll(async () => (await trendSvg.boundingBox())?.width ?? 0).toBeGreaterThan(700);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    await captureVisual(page, 'admin-dashboard-desktop.png');
  });

  test('uses a permission-filtered drawer without shrinking the mobile workspace', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareAdminDashboard(page);
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Operations Overview' })).toBeVisible();
    await expect(page.locator('[data-admin-desktop-sidebar]')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    await captureVisual(page, 'admin-dashboard-mobile.png');

    const aggregateHeading = page.getByRole('heading', { name: 'Aggregate Metrics Dashboard' });
    await aggregateHeading.scrollIntoViewIfNeeded();
    const mobileTrendSvg = page.locator('.recharts-responsive-container svg').first();
    await expect.poll(async () => (await mobileTrendSvg.boundingBox())?.height ?? 0).toBeGreaterThan(250);
    await expect.poll(async () => (await mobileTrendSvg.boundingBox())?.width ?? 0).toBeGreaterThan(280);
    await captureVisual(page, 'admin-dashboard-mobile-chart.png');

    await page.locator('[aria-controls="admin-mobile-navigation"]').click();
    const drawer = page.locator('[data-admin-mobile-navigation]');
    await expect(drawer).toBeVisible();
    await expect.poll(async () => (await drawer.boundingBox())?.width ?? 0).toBeGreaterThan(350);
    await expect.poll(async () => {
      const box = await drawer.boundingBox();
      return box ? Math.round(box.x + box.width) : 0;
    }).toBe(await page.locator('.sdkwork-admin-shell').evaluate((shell) => (
      Math.round(shell.getBoundingClientRect().right)
    )));
    await expect(drawer.getByText('Dashboard', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Sign out', { exact: true })).toBeVisible();
    await captureVisual(page, 'admin-dashboard-mobile-menu.png');

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
});
