import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Package-local test config. Tests live next to the sources they cover and run
 * in jsdom because the hardware-center surfaces are React components. `root`
 * keeps `include` relative to this package even when the runner is invoked from
 * the application root.
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
