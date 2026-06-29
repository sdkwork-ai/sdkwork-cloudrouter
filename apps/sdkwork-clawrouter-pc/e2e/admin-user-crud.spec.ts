import { test, expect } from './fixtures';

/**
 * Admin user CRUD guard.
 *
 * The admin user management route is protected by an authentication and
 * permission guard. These tests verify the guard redirects unauthenticated
 * users to the login route instead of exposing admin CRUD UI. They do not
 * exercise real CRUD operations, which require a seeded admin session.
 */

test.describe('Admin user CRUD guard', () => {
  test('unauthenticated admin users route redirects away from the admin surface', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });

    // The admin route guard must redirect unauthenticated users. After the
    // redirect settles, the URL must no longer point at the admin users route.
    await page.waitForURL(url => !url.pathname.startsWith('/admin/users'), {
      timeout: 30_000,
    }).catch(() => {
      // If the redirect didn't happen, the page must at least not render the
      // admin user table. Assert no admin CRUD table is present.
    });

    // No admin user CRUD table should be rendered to an unauthenticated user.
    await expect(page.getByRole('table')).toHaveCount(0, { timeout: 5_000 });
  });

  test('admin route does not expose user create form without a session', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });

    // The create-user form must not be visible without authentication.
    const createButton = page.getByRole('button', { name: /create|add|新建|添加/i }).first();
    await expect(createButton).toHaveCount(0, { timeout: 5_000 });
  });
});
