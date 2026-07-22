import { expect, test, type Locator, type Page } from '@playwright/test';
import path from 'node:path';

const CONSOLE_PERMISSION_SCOPE = [
  'clawrouter.console.access',
  'clawrouter.system.read',
];

const CONSOLE_ROUTES = [
  '/console/dashboard',
  '/console/usage',
  '/console/gateway',
  '/console/api-keys',
  '/console/account',
  '/console/wallet',
  '/console/coupons',
  '/console/memberships',
  '/console/checkout',
  '/console/payment',
  '/console/settlements',
  '/console/user',
  '/console/settings',
] as const;

async function prepareConsole(page: Page): Promise<void> {
  const now = Math.floor(Date.now() / 1_000);
  const session = {
    accessToken: 'console-layout-access-token',
    authToken: 'console-layout-auth-token',
    refreshToken: 'console-layout-refresh-token',
    sessionId: 'console-layout-session',
    expiresAt: now + 3_600,
    storedAt: now,
    context: {
      tenantId: '100001',
      organizationId: '0',
      userId: 'console-layout-user',
      sessionId: 'console-layout-session',
      appId: 'sdkwork-clawrouter',
      environment: 'dev',
      deploymentMode: 'standalone',
      authLevel: 'password',
      permissionScope: CONSOLE_PERMISSION_SCOPE,
      standardRoleCodes: ['console-user'],
    },
  };

  await page.addInitScript((storedSession) => {
    localStorage.setItem('sdkwork.clawRouter.appSession.v1', JSON.stringify(storedSession));
    localStorage.setItem('user_explicit_lang', 'en');
  }, session);

  await page.route('**/*', async (route) => {
    const requestPath = new URL(route.request().url()).pathname;
    if (!requestPath.startsWith('/app/v3/api/')) {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        data: requestPath === '/app/v3/api/auth/sessions/current' ? session : {},
      }),
    });
  });
}

async function navigateConsoleRoute(page: Page, routePath: string): Promise<void> {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, '', nextPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, routePath);
  await expect(page).toHaveURL(new RegExp(`${routePath.replaceAll('/', '\\/')}$`));
}

async function expectConsoleGutters(page: Page, expectedGutter: number): Promise<void> {
  const navbar = page.getByRole('banner');
  const sidebar = page.locator('[data-console-sidebar]');
  const content = page.locator('[data-console-content]');
  const contentMain = page.locator('[data-console-content-main]');

  await expect(navbar).toBeVisible();
  await expect(sidebar).toBeVisible();
  await expect(contentMain).toBeVisible();

  const [navbarBox, sidebarBox, contentBox, contentMainBox] = await Promise.all([
    navbar.boundingBox(),
    sidebar.boundingBox(),
    content.boundingBox(),
    contentMain.boundingBox(),
  ]);

  expect(navbarBox).not.toBeNull();
  expect(sidebarBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(contentMainBox).not.toBeNull();
  if (!navbarBox || !sidebarBox || !contentBox || !contentMainBox) {
    return;
  }

  expect(Math.round(contentMainBox.x - contentBox.x)).toBe(expectedGutter);
  expect(Math.round(contentMainBox.y - (navbarBox.y + navbarBox.height))).toBe(expectedGutter);
  expect(Math.round(contentBox.x + contentBox.width - (contentMainBox.x + contentMainBox.width))).toBe(expectedGutter);
  expect(Math.round(contentBox.x - (sidebarBox.x + sidebarBox.width))).toBe(0);
  expect(await content.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
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

async function resolveContrastRatio(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    const parseColor = (color: string): [number, number, number, number] => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        return [0, 0, 0, 0];
      }
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
      return [red, green, blue, alpha / 255];
    };
    const resolveBackgroundColor = (target: Element): [number, number, number] => {
      let current: Element | null = target;
      while (current) {
        const [red, green, blue, alpha] = parseColor(window.getComputedStyle(current).backgroundColor);
        if (alpha > 0.99) {
          return [red, green, blue];
        }
        current = current.parentElement;
      }
      return [255, 255, 255];
    };
    const relativeLuminance = ([red, green, blue]: number[]): number => {
      const linear = [red, green, blue].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
    };

    const foreground = parseColor(window.getComputedStyle(element).color).slice(0, 3);
    const background = resolveBackgroundColor(element);
    const foregroundLuminance = relativeLuminance(foreground);
    const backgroundLuminance = relativeLuminance(background);
    return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
      / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
  });
}

test.describe('Console content layout', () => {
  test('keeps desktop content separated from the navbar and sidebar', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1_440, height: 1_000 });
    await prepareConsole(page);
    await page.goto(CONSOLE_ROUTES[0], { waitUntil: 'domcontentloaded' });
    await expectConsoleGutters(page, 20);

    for (const routePath of CONSOLE_ROUTES.slice(1)) {
      await test.step(routePath, async () => {
        await navigateConsoleRoute(page, routePath);
        await expectConsoleGutters(page, 20);
      });
    }
    await captureVisual(page, 'console-layout-desktop.png');
  });

  test('uses compact responsive gutters on a narrow large-screen viewport', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 800, height: 900 });
    await prepareConsole(page);
    await page.goto(CONSOLE_ROUTES[0], { waitUntil: 'domcontentloaded' });

    await expectConsoleGutters(page, 16);
    for (const routePath of CONSOLE_ROUTES.slice(1)) {
      await test.step(routePath, async () => {
        await navigateConsoleRoute(page, routePath);
        await expectConsoleGutters(page, 16);
      });
    }
    await navigateConsoleRoute(page, '/console/settings');

    await expectConsoleGutters(page, 16);
    const [settingsTabsBox, settingsContentBox, contentMainBox] = await Promise.all([
      page.locator('[data-console-settings-tabs]').boundingBox(),
      page.locator('[data-console-settings-content]').boundingBox(),
      page.locator('[data-console-content-main]').boundingBox(),
    ]);
    expect(settingsTabsBox).not.toBeNull();
    expect(settingsContentBox).not.toBeNull();
    expect(contentMainBox).not.toBeNull();
    if (settingsTabsBox && settingsContentBox && contentMainBox) {
      expect(settingsContentBox.y).toBeGreaterThan(settingsTabsBox.y + settingsTabsBox.height);
      expect(Math.round(settingsContentBox.width)).toBe(Math.round(contentMainBox.width));
    }
    expect(await page.locator('[data-console-settings-tabs]').evaluate((element) => (
      element.scrollWidth > element.clientWidth
    ))).toBe(false);
    await captureVisual(page, 'console-layout-narrow.png');
  });

  test('removes duplicate outer padding from embedded commerce pages', async ({ page }) => {
    await page.setViewportSize({ width: 1_440, height: 1_000 });
    await prepareConsole(page);

    for (const surface of ['checkout', 'coupons', 'payment'] as const) {
      await page.goto(`/console/${surface}`, { waitUntil: 'domcontentloaded' });

      const frame = page.locator(`[data-console-business-page="${surface}"]`);
      await expect(frame).toBeVisible();
      const contentPadding = await frame.evaluate((element, currentSurface) => {
        const contentElement = currentSurface === 'coupons'
          ? element.querySelector<HTMLElement>(':scope > div > div')
          : element.querySelector<HTMLElement>(':scope > div > .relative');
        if (!contentElement) {
          return null;
        }
        const style = window.getComputedStyle(contentElement);
        return [
          Number.parseFloat(style.paddingTop),
          Number.parseFloat(style.paddingRight),
          Number.parseFloat(style.paddingBottom),
          Number.parseFloat(style.paddingLeft),
        ];
      }, surface);

      expect(contentPadding, surface).toEqual([0, 0, 0, 0]);
      if (surface === 'checkout') {
        const hero = frame.locator("section[style*='gradient']").first();
        await expect(hero).toBeVisible();
        expect(
          await hero.evaluate((element) => window.getComputedStyle(element).backgroundColor),
        ).not.toBe('rgba(0, 0, 0, 0)');
      }
      if (surface === 'payment') {
        const hero = frame.locator("section:first-child > div:first-child[style*='gradient']").first();
        await expect(hero).toBeVisible();
        expect(
          await hero.evaluate((element) => window.getComputedStyle(element).backgroundColor),
        ).not.toBe('rgba(0, 0, 0, 0)');

        const heroTitle = frame.getByRole('heading', { name: 'Payment center' });
        const methodsTitle = frame.getByRole('heading', { name: 'Provider rail' });
        const methodsEmpty = frame.getByText('No payment methods are currently available for this client type.');
        const recordsTitle = frame.getByRole('heading', { name: 'Payment records' });
        const recordsDescription = frame.getByText('Recent payment attempts and settlement outcomes.');
        const inactiveFilter = frame.getByRole('button', { name: 'Actionable' });
        await expect(heroTitle).toBeVisible();
        await expect(methodsTitle).toBeVisible();
        await expect(methodsEmpty).toBeVisible();
        await expect(recordsTitle).toBeVisible();
        await expect(recordsDescription).toBeVisible();
        await expect(inactiveFilter).toBeVisible();

        expect(await resolveContrastRatio(heroTitle)).toBeGreaterThanOrEqual(4.5);
        expect(await resolveContrastRatio(methodsTitle)).toBeGreaterThanOrEqual(4.5);
        expect(await resolveContrastRatio(methodsEmpty)).toBeGreaterThanOrEqual(4.5);
        expect(await resolveContrastRatio(recordsTitle)).toBeGreaterThanOrEqual(4.5);
        expect(await resolveContrastRatio(recordsDescription)).toBeGreaterThanOrEqual(4.5);
        expect(await resolveContrastRatio(inactiveFilter)).toBeGreaterThanOrEqual(4.5);
      }
      await captureVisual(page, `console-${surface}-desktop.png`);
    }
  });
});
