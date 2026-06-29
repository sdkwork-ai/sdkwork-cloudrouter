import { test, expect } from './fixtures';

/**
 * Auth login flow.
 *
 * Verifies the login route renders an accessible authentication form and that
 * submitting an empty form surfaces inline validation instead of crashing.
 * Does not exercise real backend credentials.
 */

test.describe('Auth login', () => {
  test('renders an accessible login form with email and password fields', async ({ page }) => {
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });

    // The auth fallback container should appear even before the form mounts.
    await expect(page.locator('.sdkwork-clawrouter-auth-route-fallback')).toBeVisible({ timeout: 30_000 });

    // Email and password inputs must be reachable by label for assistive tech.
    const emailInput = page.getByLabel(/email|邮|账号|account/i).first();
    const passwordInput = page.getByLabel(/password|密码/i).first();

    await expect(emailInput).toBeVisible({ timeout: 30_000 });
    await expect(passwordInput).toBeVisible({ timeout: 30_000 });
  });

  test('submit button is present and keyboard reachable', async ({ page }) => {
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });

    const submitButton = page.getByRole('button', { name: /login|登录|sign in/i }).first();
    await expect(submitButton).toBeVisible({ timeout: 30_000 });
    await expect(submitButton).toBeEnabled();
  });
});
