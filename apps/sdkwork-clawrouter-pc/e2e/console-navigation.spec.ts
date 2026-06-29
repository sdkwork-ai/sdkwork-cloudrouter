import { test, expect } from './fixtures';

/**
 * Console navigation.
 *
 * Verifies the portal app shell (Navbar, nav links, footer) renders and that
 * desktop navigation links update the URL and aria-current state. Does not
 * require an authenticated session.
 */

test.describe('Console navigation', () => {
  test('navbar banner and primary navigation are visible on desktop', async ({ portalPage: page }) => {
    await expect(page.getByRole('banner')).toBeVisible();
    // The desktop <nav> must be present. On md+ viewports it is visible.
    const nav = page.getByRole('navigation').first();
    await expect(nav).toBeVisible();
  });

  test('clicking a nav link updates the URL and aria-current', async ({ portalPage: page }) => {
    const nav = page.getByRole('navigation').first();
    // Navigate to Models via the desktop nav link.
    const modelsLink = nav.getByRole('link').filter({ hasText: /models|模型/i }).first();
    await expect(modelsLink).toBeVisible();
    await modelsLink.click();

    await expect(page).toHaveURL(/\/models/);

    // The active link must signal its state to assistive tech via aria-current.
    await expect(modelsLink).toHaveAttribute('aria-current', 'page');
  });

  test('console link is reachable from the navbar', async ({ portalPage: page }) => {
    const consoleLink = page.getByRole('link', { name: /console|控制台/i }).first();
    await expect(consoleLink).toBeVisible();
    await consoleLink.click();
    // The console route is protected, so it should redirect to auth or render
    // the console shell. Either way, the URL must leave the home route.
    await expect(page).not.toHaveURL(/^[^/]*\/\/[^/]+\/?$/);
  });

  test('footer renders on non-playground routes', async ({ portalPage: page }) => {
    await expect(page.getByRole('contentinfo')).toBeVisible({ timeout: 30_000 });
  });
});
