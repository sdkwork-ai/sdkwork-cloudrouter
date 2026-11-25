import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: [
      'packages/sdkwork-cloudrouter-pc-admin-storage/src/__tests__/**/*.test.tsx',
      'packages/sdkwork-cloudrouter-pc-console-gateway/src/ModelGroupsView.test.tsx',
      'packages/sdkwork-cloudrouter-pc-console-api-keys/src/quick-import/quickImport.test.ts',
      'packages/sdkwork-cloudroutes-pc-commons/src/file-upload/upload-declaration.test.ts',
      'packages/sdkwork-cloudroutes-pc-commons/src/drive-media.test.ts',
    ],
  },
});
