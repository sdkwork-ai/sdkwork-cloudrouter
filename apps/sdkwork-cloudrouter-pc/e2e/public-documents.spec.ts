import { test, expect } from '@playwright/test';

/**
 * Public document center E2E.
 *
 * The document API is mocked so the spec verifies the browser route, list,
 * reader, locale notice, and HTML sanitization without requiring a live
 * documents backend. The portal must still be served by `pnpm dev`.
 */

const PUBLIC_DOCUMENT = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'privacy-policy',
  locale: 'zh-CN',
  title: '隐私政策',
  summary: '我们如何处理个人信息。',
  body: '<h2>信息收集</h2><p>我们仅收集提供服务所需的信息。</p><script>window.__xss = true;</script>',
  category: 'policy',
  publishedAt: '2026-11-12',
};

const LIST_BODY = {
  code: 0,
  traceId: '00000000-0000-4000-8000-000000000001',
  data: { items: [PUBLIC_DOCUMENT], pageInfo: { mode: 'offset', page: 1, pageSize: 20 } },
};

const RETRIEVE_BODY = {
  code: 0,
  traceId: '00000000-0000-4000-8000-000000000002',
  data: { item: PUBLIC_DOCUMENT },
};

test.describe('public document center', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/app/v3/api/documents/public**', async (route) => {
      const url = route.request().url();
      const isDetail = !/\/public(\?|$)/.test(url);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isDetail ? RETRIEVE_BODY : LIST_BODY),
      });
    });
  });

  test('lists published documents and opens a reader', async ({ page }) => {
    await page.goto('/docs', { waitUntil: 'domcontentloaded' });
    const link = page.getByRole('link', { name: /隐私政策/ }).first();
    await expect(link).toBeVisible({ timeout: 30_000 });
    await link.click();
    await expect(page).toHaveURL(/\/docs\/privacy-policy/);
    await expect(page.getByRole('heading', { name: '隐私政策' })).toBeVisible();
    await expect(page.getByText('信息收集')).toBeVisible();
  });

  test('sanitizes stored HTML before rendering', async ({ page }) => {
    await page.goto('/docs/privacy-policy', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '隐私政策' })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('article script')).toHaveCount(0);
    const injected = await page.evaluate(() => (window as { __xss?: boolean }).__xss ?? false);
    expect(injected).toBe(false);
  });
});
