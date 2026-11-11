import { expect, test, type Page } from '@playwright/test';

/**
 * Regression for the operator-configured logo.
 *
 * The logo published from `/admin/site` is stored as a Drive reference (`drive://...` plus a
 * reader share token), not as an HTTP URL. Two things therefore have to hold end to end, and both
 * have broken before:
 *
 * 1. every brand surface resolves the reference into a download URL before rendering it, instead
 *    of handing `drive://...` to an `<img src>` (which shows a broken image and makes the upload
 *    look like it never saved);
 * 2. the save path carries that reference back unchanged, so editing any other field cannot drop
 *    the logo.
 *
 * The suite drives the real portal against stubbed API responses; the Drive upload protocol itself
 * belongs to the Drive service and is covered by the upload-declaration tests.
 */

const PERMISSION_SCOPE = [
  'cloudrouter.admin.access',
  'cloudrouter.console.access',
  'cloudrouter.system.read',
  'cloudrouter.system.write',
  'iam.users.read',
];

const SHARE_TOKEN = 'logo-share-token';
/** Local, real image: proves the resolved URL actually loads, not merely that it is a string. */
const RESOLVED_LOGO_PATH = '/brand/logo.png';
const RESOLVED_LOGO_URL = `${RESOLVED_LOGO_PATH}?share=${SHARE_TOKEN}`;

const DRIVE_LOGO = {
  kind: 'image',
  source: 'drive',
  uri: 'drive://spaces/space-1/nodes/node-1',
  id: 'node-1',
  fileName: 'brand-logo.png',
  mimeType: 'image/png',
  sizeBytes: '8421',
  metadata: {
    drive: { spaceId: 'space-1', nodeId: 'node-1', shareToken: SHARE_TOKEN },
    uploadCategory: 'public_asset',
    uploadSlot: 'site-logo',
  },
};

function siteSettingsPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    siteName: 'Acme Router',
    shortName: 'Acme Router',
    description: 'Unified gateway for the Acme product line.',
    logo: DRIVE_LOGO,
    ...overrides,
  };
}

/**
 * Seeds an admin session and answers the three requests this flow depends on: the current session,
 * the site settings document (read + save) and the Drive open share-link exchange that turns the
 * stored token into a download URL.
 */
async function preparePortal(
  page: Page,
  onSave: (payload: Record<string, unknown>) => void,
): Promise<void> {
  const now = Math.floor(Date.now() / 1_000);
  const session = {
    accessToken: 'logo-access-token',
    authToken: 'logo-auth-token',
    refreshToken: 'logo-refresh-token',
    sessionId: 'logo-session',
    expiresAt: now + 3_600,
    storedAt: now,
    context: {
      tenantId: '100001',
      organizationId: '0',
      userId: 'logo-admin',
      sessionId: 'logo-session',
      appId: 'sdkwork-cloudrouter',
      environment: 'dev',
      deploymentMode: 'standalone',
      authLevel: 'password',
      permissionScope: PERMISSION_SCOPE,
      standardRoleCodes: ['backend-root-admin'],
    },
  };

  await page.addInitScript((storedSession) => {
    localStorage.setItem('sdkwork.cloudRouter.appSession.v1', JSON.stringify(storedSession));
    localStorage.setItem('user_explicit_lang', 'en');
  }, session);

  await page.route('**/*', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const fulfill = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data }),
    });

    if (path === '/app/v3/api/auth/sessions/current') {
      await fulfill(session);
      return;
    }
    if (path === '/app/v3/api/system/site/runtime') {
      await fulfill(siteSettingsPayload());
      return;
    }
    if (path === '/backend/v3/api/system/site/settings') {
      if (request.method() === 'GET') {
        await fulfill(siteSettingsPayload());
        return;
      }
      const payload = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      onSave(payload);
      // Echo the merged document the way the service does, so the page settles on the saved state.
      await fulfill(siteSettingsPayload(payload));
      return;
    }
    if (path === `/open/v3/api/drive/share_links/${SHARE_TOKEN}/download_url`) {
      await fulfill({
        item: {
          downloadUrl: RESOLVED_LOGO_URL,
          expiresAtEpochMs: String(Date.now() + 3_600_000),
        },
      });
      return;
    }
    if (
      path.startsWith('/app/v3/api/')
      || path.startsWith('/backend/v3/api/')
      || path.startsWith('/open/v3/api/')
    ) {
      await fulfill({});
      return;
    }
    await route.continue();
  });
}

test.describe('site logo configured from /admin/site', () => {
  test('the public surfaces render the uploaded logo, never its drive reference', async ({ page }) => {
    await preparePortal(page, () => {});

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const mark = page.locator('header img').first();
    await expect(mark).toHaveAttribute('src', new RegExp(`share=${SHARE_TOKEN}`), { timeout: 30_000 });
    // The reference itself must never reach the document.
    expect(await mark.getAttribute('src')).not.toContain('drive://');
    // And the resolved URL has to be a real image the browser can decode.
    await expect
      .poll(async () => mark.evaluate((node) => (node as HTMLImageElement).naturalWidth), { timeout: 15_000 })
      .toBeGreaterThan(0);

    // The footer mark goes through the same resolver, not a second implementation.
    const footerMark = page.locator('footer img').first();
    await expect(footerMark).toHaveAttribute('src', new RegExp(`share=${SHARE_TOKEN}`), { timeout: 15_000 });

    // The tab icon falls back across favicon → icon → logo, and the fallback is a Drive resource
    // too: an unresolved reference here leaves the browser on the shipped icon instead of the
    // operator's logo.
    await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute(
      'href',
      new RegExp(`share=${SHARE_TOKEN}`),
      { timeout: 15_000 },
    );
  });

  test('the admin site page previews the uploaded logo and saves it back unchanged', async ({ page }) => {
    const saves: Array<Record<string, unknown>> = [];
    await preparePortal(page, (payload) => saves.push(payload));

    await page.goto('/admin/site', { waitUntil: 'domcontentloaded' });

    // The admin chrome carries the same mark, so a saved logo is visible while the operator edits.
    await expect(page.locator('header img').first()).toHaveAttribute(
      'src',
      new RegExp(`share=${SHARE_TOKEN}`),
      { timeout: 30_000 },
    );

    await page.locator('[data-admin-site-category="assets"]').click();
    const assets = page.locator('[data-admin-site-panel="assets"]');
    const preview = page.locator('[data-admin-site-logo-preview]');
    await expect(preview).toHaveAttribute('src', new RegExp(`share=${SHARE_TOKEN}`), { timeout: 30_000 });
    await expect(page.locator('[data-admin-site-logo-status]')).toContainText('Using the uploaded logo');
    await expect
      .poll(async () => preview.evaluate((node) => (node as HTMLImageElement).naturalWidth), { timeout: 15_000 })
      .toBeGreaterThan(0);

    // The upload control itself: the logo field must be wired to the shared Drive uploader rather
    // than to a URL text box, because that is how an operator replaces the artwork.
    await expect(assets.locator('input[type="file"]').first()).toBeAttached();

    // Editing an unrelated field and saving must keep the logo reference intact.
    await page.locator('[data-admin-site-category="identity"]').click();
    // Exact name: the tab also carries a per-language override field ("Site name · English").
    await page.getByRole('textbox', { name: 'Site name', exact: true }).fill('Acme Router EU');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => saves.length, { timeout: 15_000 }).toBeGreaterThan(0);
    expect(saves[0].logo).toMatchObject({
      kind: 'image',
      source: 'drive',
      uri: 'drive://spaces/space-1/nodes/node-1',
      metadata: { drive: { shareToken: SHARE_TOKEN }, uploadSlot: 'site-logo' },
    });
  });

  /**
   * Removing the logo has to travel as an explicit empty reference: the update contract has no
   * nullable media field, so a dropped key means "keep the stored logo" and the old artwork comes
   * back on the next load.
   */
  test('clearing the logo saves an empty reference and falls back to the shipped mark', async ({ page }) => {
    const saves: Array<Record<string, unknown>> = [];
    await preparePortal(page, (payload) => saves.push(payload));

    await page.goto('/admin/site', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-admin-site-category="assets"]').click();

    // Only the logo is configured in the stubbed document, so the only Remove action belongs to it.
    await page.locator('[data-admin-site-panel="assets"]').getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator('[data-admin-site-logo-status]')).toContainText('Using the built-in brand mark');
    await expect(page.locator('[data-admin-site-logo-preview]')).toHaveAttribute('src', RESOLVED_LOGO_PATH);

    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => saves.length, { timeout: 15_000 }).toBeGreaterThan(0);
    expect(saves[0].logo).toEqual({ kind: 'image', source: 'external_url', publicUrl: '' });
  });
});
