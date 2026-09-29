import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: [
      'packages/sdkwork-cloudrouter-pc-admin-storage/src/__tests__/**/*.test.tsx',
      'packages/sdkwork-cloudroutes-pc-commons/src/file-upload/upload-declaration.test.ts',
    ],
  },
});
