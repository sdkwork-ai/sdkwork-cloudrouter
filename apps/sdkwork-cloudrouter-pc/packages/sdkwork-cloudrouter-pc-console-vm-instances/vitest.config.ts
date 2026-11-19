import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/** Package-local tests (jsdom: the console page renders React tables and forms). */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
