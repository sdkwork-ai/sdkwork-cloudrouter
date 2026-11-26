import { defineConfig } from 'vitest/config';
import { WORKSPACE_SOURCE_RESOLVE_EXTENSIONS } from '../../scripts/lib/workspace-source-resolution.mjs';

export default defineConfig({
  resolve: {
    // Same source-first extension order the app's vite.config uses: workspace
    // packages are consumed as source and an extensionless internal import must
    // bind to authored TypeScript, not a gitignored `tsc` artifact left beside
    // it (`src/*.js`), which would test a stale revision.
    extensions: [...WORKSPACE_SOURCE_RESOLVE_EXTENSIONS],
  },
  test: {
    environment: 'jsdom',
    include: [
      'packages/sdkwork-cloudrouter-pc-admin-storage/src/__tests__/**/*.test.tsx',
      'packages/sdkwork-cloudrouter-pc-console-gateway/src/ModelGroupsView.test.tsx',
      'packages/sdkwork-cloudrouter-pc-console-api-keys/src/accountGroups.test.ts',
      'packages/sdkwork-cloudrouter-pc-console-api-keys/src/quick-import/quickImport.test.ts',
      'packages/sdkwork-cloudroutes-pc-commons/src/file-upload/upload-declaration.test.ts',
      'packages/sdkwork-cloudroutes-pc-commons/src/drive-media.test.ts',
      'packages/sdkwork-cloudrouter-pc-admin-billing/tests/**/*.test.ts',
    ],
  },
});
