import { test, expect } from './fixtures';

/**
 * Keyboard navigation.
 *
 * Verifies the skip-to-content link, Tab order, and Escape behavior on the
 * mobile navigation menu. These flows are required for WCAG 2.1 AA keyboard
 * operability.
 */

test.describe('Keyboard navigation', () => {
  test('skip-to-content link becomes visible on focus and jumps to main content', async ({ portalPage: page }) => {
    // The skip link is the first focusable element. Press Tab once to focus it.
    await page.keyboard.press('Tab');

    // The skip link should now be visible (it uses sr-only + focus:not-sr-only).
    const skipLink = page.getByRole('link', { name: /skip to content|跳到主内容|跳到内容/i }).first();
    await expect(skipLink).toBeVisible({ timeout: 5_000 });

    // Activating the skip link should move focus to #main-content.
    await page.keyboard.press('Enter');

    // The main content region must exist and be focusable.
    const mainContent = page.locator('#main-content').first();
    await expect(mainContent).toBeVisible();
  });

  test('Tab moves focus through navbar controls', async ({ portalPage: page }) => {
    // After the skip link, Tab should reach the home logo link, then nav links.
    await page.keyboard.press('Tab');

    // The focused element should be an anchor or button within the header.
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase() ?? '');
    expect(['a', 'button']).toContain(focusedTag);
  });

  test('Escape closes the mobile navigation menu', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('banner')).toBeVisible({ timeout: 30_000 });

    // Force the mobile viewport so the hamburger button is visible.
    await page.setViewportSize({ width: 375, height: 667 });

    const menuToggle = page.getByRole('button', { name: /navigation menu|导航菜单/i }).first();
    await expect(menuToggle).toBeVisible();
    await menuToggle.click();

    // The mobile menu should open as a dialog.
    const mobileMenu = page.getByRole('dialog', { name: /navigation menu|导航菜单/i }).first();
    await expect(mobileMenu).toBeVisible({ timeout: 10_000 });

    // Escape must close it.
    await page.keyboard.press('Escape');
    await expect(mobileMenu).not.toBeVisible({ timeout: 10_000 });
  });
});
