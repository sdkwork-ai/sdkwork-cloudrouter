import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Package-local test config for the Product Center surface. The pages are
 * React components, so the suite runs in jsdom; `root` keeps `include`
 * relative to this package even when the runner is invoked from the
 * application root.
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
