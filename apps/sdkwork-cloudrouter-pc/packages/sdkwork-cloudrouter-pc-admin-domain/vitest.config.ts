import { defineConfig } from 'vitest/config';

/**
 * Package-local test configuration.
 *
 * The suite covers the Domain Center's pure projection layer: identity/format
 * helpers and input validation over the deployments domain contract. It needs
 * no React tree, no network, and no portal runtime environment, so the app-root
 * Vite config (which materialises the browser dev proxy out of the portal
 * environment) is deliberately not loaded here.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
