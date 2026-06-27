import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, "");
  return {
    define: {
      "process.env.SDKWORK_ACCESS_TOKEN": JSON.stringify(env.SDKWORK_ACCESS_TOKEN ?? ""),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "sdkwork-mcp-app-sdk-generated-typescript/src": path.resolve(
          repoRoot,
          "sdks/sdkwork-mcp-app-sdk/sdkwork-mcp-app-sdk-typescript/generated/server-openapi/src",
        ),
        "@sdkwork/mcp-h5-core": path.resolve(appRoot, "packages/sdkwork-mcp-h5-core/src"),
        "@sdkwork/mcp-h5-core/services": path.resolve(appRoot, "packages/sdkwork-mcp-h5-core/src/services/index.ts"),
        "@sdkwork/mcp-h5-commons": path.resolve(appRoot, "packages/sdkwork-mcp-h5-commons/src/index.ts"),
        "@sdkwork/mcp-h5-mcp": path.resolve(appRoot, "packages/sdkwork-mcp-h5-mcp/src/index.ts"),
        "@sdkwork/mcp-h5-shell": path.resolve(appRoot, "packages/sdkwork-mcp-h5-shell/src/index.ts"),
        "@sdkwork/sdk-common": path.resolve(
          repoRoot,
          "../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/src/index.ts",
        ),
      },
    },
    server: { port: 5196 },
  };
});
