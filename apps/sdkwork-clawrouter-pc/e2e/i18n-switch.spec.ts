import { test, expect } from './fixtures';

/**
 * i18n switch.
 *
 * Verifies the navbar language menu opens, exposes the supported languages,
 * and that selecting a different language updates the resolved language code
 * displayed in the toggle. The portal supports English and Chinese.
 */

test.describe('i18n switch', () => {
  test('language toggle opens a menu with available languages', async ({ portalPage: page }) => {
    const langToggle = page.getByRole('button', { name: /language|语言/i }).first();
    await expect(langToggle).toBeVisible();
    await expect(langToggle).toHaveAttribute('aria-expanded', 'false');

    await langToggle.click();

    await expect(langToggle).toHaveAttribute('aria-expanded', 'true');
    // The menu must be labeled and reachable.
    const menu = page.getByRole('menu', { name: /language|语言/i }).first();
    await expect(menu).toBeVisible({ timeout: 10_000 });

    // At least two languages (English and Chinese) should be offered.
    const menuItems = menu.getByRole('menuitem');
    await expect(menuItems).toHaveCount(2, { timeout: 10_000 });
  });

  test('selecting Chinese updates the resolved language label', async ({ portalPage: page }) => {
    const langToggle = page.getByRole('button', { name: /language|语言/i }).first();
    await langToggle.click();

    const menu = page.getByRole('menu', { name: /language|语言/i }).first();
    // Pick the Chinese option.
    const zhOption = menu.getByRole('menuitem').filter({ hasText: /中文/ }).first();
    await zhOption.click();

    // The toggle label shows the resolved language code in uppercase.
    await expect(langToggle.locator('span').first()).toHaveText(/^ZH$/i, { timeout: 10_000 });
  });

  test('selecting English restores the English language label', async ({ portalPage: page }) => {
    const langToggle = page.getByRole('button', { name: /language|语言/i }).first();
    await langToggle.click();

    const menu = page.getByRole('menu', { name: /language|语言/i }).first();
    const enOption = menu.getByRole('menuitem').filter({ hasText: /English/ }).first();
    await enOption.click();

    await expect(langToggle.locator('span').first()).toHaveText(/^EN$/i, { timeout: 10_000 });
  });
});
