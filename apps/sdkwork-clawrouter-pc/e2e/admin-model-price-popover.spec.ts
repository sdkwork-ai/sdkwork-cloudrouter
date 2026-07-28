import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const PERMISSION_SCOPE = [
  'clawrouter.admin.access',
  'clawrouter.system.read',
];

const MODEL_VENDOR = {
  id: 'vendor-openai',
  vendorCode: 'openai',
  name: 'OpenAI',
  status: 'active',
  color: '#111827',
  description: 'OpenAI model catalog',
};

const PRICED_MODEL = {
  id: 'model-gpt-5',
  vendorId: MODEL_VENDOR.id,
  vendorCode: MODEL_VENDOR.vendorCode,
  model: 'gpt-5',
  displayName: 'GPT-5',
  name: 'GPT-5',
  type: 'Chat',
  regionPrices: [
    {
      regionCode: 'global',
      currency: 'USD',
      priceIn: '1.250000',
      priceOut: '10.000000',
      cacheReadPrice: '0.125000',
      cacheWritePrice: '1.250000',
    },
    {
      regionCode: 'china',
      currency: 'CNY',
      priceIn: '9.000000',
      priceOut: '72.000000',
      cacheReadPrice: '0.900000',
      cacheWritePrice: '9.000000',
    },
  ],
  status: 'active',
  calls: '128',
  description: 'Visual regression fixture',
  modalities: ['text'],
  inputModalities: ['text'],
  outputModalities: ['text'],
  apiFormat: 'openai-chat-completions',
  capabilityIntro: 'General-purpose reasoning model',
  limitations: [],
  supportedLanguages: ['en', 'zh'],
  useCases: ['chat'],
  trainingDataCutoff: null,
  contextTokens: 128_000,
  maxOutputTokens: 16_384,
  supportsStreaming: true,
  supportsTools: true,
  supportsJsonSchema: true,
  releaseStage: 1,
  shelfState: 1,
  routingState: 1,
  replacementModel: null,
};

async function prepareAdminModelCatalog(page: Page): Promise<void> {
  const now = Math.floor(Date.now() / 1_000);
  const session = {
    accessToken: 'model-price-access-token',
    authToken: 'model-price-auth-token',
    refreshToken: 'model-price-refresh-token',
    sessionId: 'model-price-session',
    expiresAt: now + 3_600,
    storedAt: now,
    context: {
      tenantId: '100001',
      organizationId: '0',
      userId: 'model-price-admin',
      sessionId: 'model-price-session',
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
    const requestPath = new URL(route.request().url()).pathname;
    const fulfill = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data }),
    });

    if (requestPath === '/app/v3/api/auth/sessions/current') {
      await fulfill(session);
      return;
    }
    if (requestPath === '/backend/v3/api/ai/model_vendors') {
      await fulfill({ items: [MODEL_VENDOR] });
      return;
    }
    if (requestPath === '/backend/v3/api/ai/models') {
      await fulfill({
        items: [PRICED_MODEL],
        pageInfo: { totalItems: 1, hasMore: false },
      });
      return;
    }
    if (requestPath === '/backend/v3/api/ai/model_rankings') {
      await fulfill({ items: [] });
      return;
    }
    if (requestPath.startsWith('/app/v3/api/') || requestPath.startsWith('/backend/v3/api/')) {
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

async function openPricePopover(page: Page) {
  const summary = page.locator(`[data-admin-model-price-summary="${PRICED_MODEL.id}"]`);
  await expect(summary).toBeVisible();
  await summary.click();
  const popover = page.locator('[data-admin-model-price-popover]');
  await expect(popover).toBeVisible();
  return popover;
}

test.describe('Admin model price details popover', () => {
  test('renders an opaque 480px body portal above the admin table', async ({ page }) => {
    await page.setViewportSize({ width: 1_440, height: 1_000 });
    await prepareAdminModelCatalog(page);
    await page.goto('/admin/model', { waitUntil: 'domcontentloaded' });

    const popover = await openPricePopover(page);
    const appearance = await popover.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        backgroundColor: style.backgroundColor,
        opacity: style.opacity,
        position: style.position,
        width: rect.width,
        zIndex: style.zIndex,
        parentIsBody: element.parentElement === document.body,
        viewportContained: rect.left >= 0 && rect.right <= window.innerWidth,
      };
    });

    expect(appearance).toEqual({
      backgroundColor: 'rgb(255, 255, 255)',
      opacity: '1',
      position: 'fixed',
      width: 480,
      zIndex: '2147483000',
      parentIsBody: true,
      viewportContained: true,
    });
    await expect(popover.getByText('Pricing details', { exact: true })).toBeVisible();
    await expect(popover.getByRole('tab', { name: 'Global', exact: true })).toBeVisible();
    await expect(popover.getByRole('tab', { name: 'china', exact: true })).toBeVisible();
    await captureVisual(page, 'admin-model-price-popover-desktop.png');

    await page.locator('html').evaluate((element) => element.classList.add('dark'));
    await expect.poll(() => popover.evaluate((element) => getComputedStyle(element).backgroundColor))
      .toBe('rgb(26, 26, 26)');
    await captureVisual(page, 'admin-model-price-popover-dark.png');
  });

  test('stays opaque and contained on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareAdminModelCatalog(page);
    await page.goto('/admin/model', { waitUntil: 'domcontentloaded' });

    const popover = await openPricePopover(page);
    const appearance = await popover.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        backgroundColor: style.backgroundColor,
        opacity: style.opacity,
        width: rect.width,
        expectedWidth: window.innerWidth - 32,
        left: rect.left,
        right: rect.right,
        viewportWidth: window.innerWidth,
      };
    });

    expect(appearance.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(appearance.opacity).toBe('1');
    expect(appearance.width).toBe(appearance.expectedWidth);
    expect(appearance.left).toBeGreaterThanOrEqual(16);
    expect(appearance.right).toBeLessThanOrEqual(appearance.viewportWidth - 16);
    await captureVisual(page, 'admin-model-price-popover-narrow.png');
  });
});
