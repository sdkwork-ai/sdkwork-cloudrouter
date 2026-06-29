import { test as base, expect, type Page } from '@playwright/test';

/**
 * Shared Playwright fixtures for the ClawRouter PC portal E2E suite.
 *
 * The portal dev server is started by `playwright.config.ts` (webServer). These
 * fixtures provide small helpers reused across the six spec files so each spec
 * stays focused on the user flow it verifies.
 */

export const PORTAL_HOME = '/';

/** Navigate to the portal home and wait for the app shell to render. */
async function openPortalHome(page: Page): Promise<void> {
  await page.goto(PORTAL_HOME, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('banner')).toBeVisible({ timeout: 30_000 });
}

export const test = base.extend<{ portalPage: Page }>({
  portalPage: async ({ page }, use) => {
    await openPortalHome(page);
    await use(page);
  },
});

export { expect };
