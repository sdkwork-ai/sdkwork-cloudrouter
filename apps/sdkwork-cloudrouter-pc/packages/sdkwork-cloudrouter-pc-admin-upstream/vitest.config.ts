import { defineConfig } from 'vitest/config';

/**
 * Package-local test configuration.
 *
 * The suite is a pure data projection over the generated vendor catalog matrix:
 * no React, no network, and no portal runtime environment. Keeping the config
 * local is what makes `pnpm --filter @sdkwork/cloudrouter-pc-admin-upstream test`
 * self-contained — the app-root `vite.config.ts` resolves the browser dev-proxy
 * targets out of the portal environment and refuses to load at all when
 * `.env.development` has not been materialised, which has nothing to do with
 * what this suite asserts.
 *
 * Sibling packages document the same split (`sdkwork-cloudrouter-pc-console-agents`,
 * `sdkwork-cloudrouter-pc-admin-storage`): scope and environment belong to the
 * package that owns the tests.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
