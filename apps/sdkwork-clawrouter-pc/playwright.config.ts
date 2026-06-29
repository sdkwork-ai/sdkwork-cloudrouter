import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for the SDKWork ClawRouter PC portal.
 *
 * The portal dev server is expected to be reachable at the configured baseURL
 * (default http://127.0.0.1:3901, matching `pnpm dev`). Specs use
 * `test.skip` when the portal is unreachable so the suite can run in CI
 * without a live backend when E2E is gated behind `continue-on-error`.
 *
 * Run locally:
 *   pnpm --dir apps/sdkwork-clawrouter-pc test:e2e
 *
 * Run a single spec:
 *   pnpm --dir apps/sdkwork-clawrouter-pc exec playwright test e2e/theme-switch.spec.ts
 */
const PORTAL_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3901';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: PORTAL_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_WEBSERVER_DISABLED
    ? undefined
    : {
        command: 'pnpm dev',
        url: PORTAL_BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        reuseExistingServerTimeout: 30_000,
      },
});
