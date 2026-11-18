import { expect, test, type Page } from '@playwright/test';

const PERMISSION_SCOPE = [
  'cloudrouter.admin.access',
  'cloudrouter.console.access',
  'cloudrouter.system.read',
];

function buildAdminSession(): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1_000);
  return {
    accessToken: 'e2e-access-token',
    authToken: 'e2e-auth-token',
    refreshToken: 'e2e-refresh-token',
    sessionId: 'application-session',
    expiresAt: now + 3_600,
    storedAt: now,
    context: {
      tenantId: '100001',
      organizationId: '0',
      userId: 'application-admin',
      sessionId: 'application-session',
      appId: 'sdkwork-cloudrouter',
      environment: 'dev',
      deploymentMode: 'standalone',
      authLevel: 'password',
      permissionScope: PERMISSION_SCOPE,
      standardRoleCodes: ['backend-root-admin'],
    },
  };
}

async function seedAdminSession(page: Page): Promise<void> {
  await page.addInitScript((session) => {
    localStorage.setItem('sdkwork.cloudRouter.appSession.v1', JSON.stringify(session));
    localStorage.setItem('user_explicit_lang', 'zh-CN');
  }, buildAdminSession());
}

async function mockApis(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const fulfill = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data }),
    });

    if (path === '/app/v3/api/auth/sessions/current') {
      await fulfill(buildAdminSession());
      return;
    }
    if (path.startsWith('/app/v3/api/') || path.startsWith('/backend/v3/api/')) {
      await fulfill({
        items: [],
        pageInfo: { mode: 'offset', page: 1, pageSize: 200, totalItems: 0, totalPages: 0 },
        hasMore: false,
        nextCursor: null,
      });
      return;
    }
    await route.continue();
  });
}

test.describe('application center category header', () => {
  // The first navigation compiles the lazily loaded admin chunks; a cold dev
  // server can exceed the default 30s navigation timeout.
  test.use({ navigationTimeout: 60_000 });
  test('renders one category header with a single refresh action', async ({ page }) => {
    await seedAdminSession(page);
    await mockApis(page);

    await page.goto('/admin/applications/categories');

    // The category panel owns the header on this view; the page-level header
    // must not be rendered twice (no duplicate title/refresh).
    await expect(page.getByText(/应用分类管理|Application categories/u)).toBeVisible();
    await expect(page.getByRole('button', { name: /刷新|Refresh/u })).toHaveCount(1);
    await expect(page.getByText('一级分类', { exact: true })).toBeVisible();
  });
});
