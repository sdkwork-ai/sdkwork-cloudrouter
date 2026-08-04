import { expect, test } from '@playwright/test';

test('keeps Agents full-screen overlays below the Playground header', async ({ page }) => {
  const response = await page.goto('/playground');
  expect(response?.ok()).toBe(true);

  const header = page.locator('header').first();
  const workbench = page.locator('.sdkwork-agents-workbench');
  await expect(header).toBeVisible();
  await expect(workbench).toBeVisible();

  const overlay = page.locator('[data-playground-overlay-inset-probe]');
  await workbench.evaluate((element) => {
    const probe = document.createElement('div');
    probe.className = 'fixed inset-0';
    probe.dataset.playgroundOverlayInsetProbe = 'true';
    probe.style.pointerEvents = 'none';
    element.appendChild(probe);
  });

  const headerBox = await header.boundingBox();
  const overlayBox = await overlay.boundingBox();
  if (!headerBox || !overlayBox) {
    throw new Error('Playground header and overlay probe must have measurable bounds');
  }
  expect(overlayBox.y).toBeCloseTo(headerBox.y + headerBox.height, 0);
});
