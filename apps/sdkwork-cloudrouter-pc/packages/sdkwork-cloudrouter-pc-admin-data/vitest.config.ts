import { defineConfig } from 'vitest/config';

/**
 * Package-local test config.
 *
 * `packages/**` has no own `node_modules/.bin`, so the package script points at
 * the application-root vitest binary while the config stays here, mirroring the
 * other admin packages. `node` environment: these are service-boundary tests,
 * not component renders.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
