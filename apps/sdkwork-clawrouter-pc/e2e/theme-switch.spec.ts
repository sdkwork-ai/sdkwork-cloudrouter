import { test, expect } from './fixtures';

/**
 * Theme switch.
 *
 * Verifies the navbar theme toggle button flips the document dark class and
 * that the toggle remains keyboard accessible. The portal persists theme
 * choice, so toggling twice should restore the original state.
 */

test.describe('Theme switch', () => {
  test('toggling theme flips the dark class on the html element', async ({ portalPage: page }) => {
    const themeButton = page.getByRole('button', { name: /theme|主题/i }).first();
    await expect(themeButton).toBeVisible();

    const htmlEl = page.locator('html');
    const wasDark = await htmlEl.evaluate(el => el.classList.contains('dark'));

    await themeButton.click();

    if (wasDark) {
      await expect(htmlEl).not.toHaveClass(/\bdark\b/, { timeout: 10_000 });
    } else {
      await expect(htmlEl).toHaveClass(/\bdark\b/, { timeout: 10_000 });
    }
  });

  test('theme toggle reflects pressed state via aria-pressed', async ({ portalPage: page }) => {
    const themeButton = page.getByRole('button', { name: /theme|主题/i }).first();
    await expect(themeButton).toHaveAttribute('aria-pressed');

    const pressedBefore = await themeButton.getAttribute('aria-pressed');
    await themeButton.click();

    const pressedAfter = await themeButton.getAttribute('aria-pressed');
    expect(pressedBefore).not.toEqual(pressedAfter);
  });

  test('toggling theme twice restores the original state', async ({ portalPage: page }) => {
    const themeButton = page.getByRole('button', { name: /theme|主题/i }).first();
    const htmlEl = page.locator('html');
    const wasDark = await htmlEl.evaluate(el => el.classList.contains('dark'));

    await themeButton.click();
    await themeButton.click();

    if (wasDark) {
      await expect(htmlEl).toHaveClass(/\bdark\b/, { timeout: 10_000 });
    } else {
      await expect(htmlEl).not.toHaveClass(/\bdark\b/, { timeout: 10_000 });
    }
  });
});
