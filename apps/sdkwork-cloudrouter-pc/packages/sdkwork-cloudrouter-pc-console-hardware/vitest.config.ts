import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/** Package-local tests (jsdom: the console group renders React pages). */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
