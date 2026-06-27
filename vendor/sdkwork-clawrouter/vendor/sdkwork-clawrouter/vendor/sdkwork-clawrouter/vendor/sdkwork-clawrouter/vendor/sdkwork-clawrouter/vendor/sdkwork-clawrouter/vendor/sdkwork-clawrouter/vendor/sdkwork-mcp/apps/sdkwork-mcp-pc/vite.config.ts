import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const appbaseRoot = path.resolve(repoRoot, '../sdkwork-appbase');
const iamRoot = path.resolve(repoRoot, '../sdkwork-iam');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const platformApiGatewayTarget =
    env.VITE_SDKWORK_MCP_PLATFORM_API_GATEWAY_HTTP_URL ??
    'http://127.0.0.1:3900';

  return {
    define: {
      'process.env.SDKWORK_ACCESS_TOKEN': JSON.stringify(env.SDKWORK_ACCESS_TOKEN ?? ''),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@sdkwork/iam-app-sdk': path.resolve(iamRoot, 'sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/index.ts',
        ),
        '@sdkwork/auth-pc-react': path.resolve(iamRoot, 'apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src/index.ts',
        ),
        '@sdkwork/auth-runtime-pc-react': path.resolve(iamRoot, 'apps/sdkwork-iam-pc/packages/sdkwork-auth-runtime-pc-react/src/index.ts',
        ),
        '@sdkwork/core-pc-react': path.resolve(
          repoRoot,
          '../sdkwork-core/sdkwork-core-pc-react/src/index.ts',
        ),
        '@sdkwork/iam-contracts': path.resolve(iamRoot, 'apps/sdkwork-iam-common/packages/sdkwork-iam-contracts/src/index.ts',
        ),
        '@sdkwork/iam-runtime': path.resolve(iamRoot, 'apps/sdkwork-iam-common/packages/sdkwork-iam-runtime/src/index.ts',
        ),
        '@sdkwork/i18n-pc-react': path.resolve(
          appbaseRoot,
          'packages/pc-react/foundation/sdkwork-i18n-pc-react/src/index.ts',
        ),
        '@sdkwork/runtime-bootstrap': path.resolve(
          appbaseRoot,
          'packages/common/foundation/sdkwork-runtime-bootstrap/src/index.ts',
        ),
        '@sdkwork/ui-pc-react': path.resolve(
          repoRoot,
          '../sdkwork-ui/sdkwork-ui-pc-react/src/index.ts',
        ),
        '@sdkwork/drive-app-sdk': path.resolve(
          repoRoot,
          '../sdkwork-drive/sdks/sdkwork-drive-app-sdk/sdkwork-drive-app-sdk-typescript/src/index.ts',
        ),
        '@sdkwork/sdk-common': path.resolve(
          repoRoot,
          '../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/src/index.ts',
        ),
        '@sdkwork/utils': path.resolve(
          repoRoot,
          '../sdkwork-utils/packages/sdkwork-utils-typescript/src/index.ts',
        ),
        'sdkwork-mcp-app-sdk-generated-typescript/src': path.resolve(
          repoRoot,
          'sdks/sdkwork-mcp-app-sdk/sdkwork-mcp-app-sdk-typescript/generated/server-openapi/src',
        ),
        'sdkwork-mcp-backend-sdk-generated-typescript/src': path.resolve(
          repoRoot,
          'sdks/sdkwork-mcp-backend-sdk/sdkwork-mcp-backend-sdk-typescript/generated/server-openapi/src',
        ),
      },
    },
    server: {
      port: 5175,
      strictPort: true,
      proxy: {
        '/app/v3/api': {
          target: platformApiGatewayTarget,
          changeOrigin: true,
        },
        '/backend/v3/api': {
          target: platformApiGatewayTarget,
          changeOrigin: true,
        },
        '/app': {
          target: 'http://127.0.0.1:18090',
          changeOrigin: true,
        },
        '/backend': {
          target: 'http://127.0.0.1:18091',
          changeOrigin: true,
        },
      },
    },
  };
});
