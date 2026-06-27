#!/usr/bin/env node
import { resolveFamilySdkRoot, runMcpSdkGenerator } from "../../../tools/mcp_sdk_generator_runner.mjs";

runMcpSdkGenerator(
  {
    apiAuthority: "sdkwork-mcp.app",
    apiPrefix: "/app/v3/api",
    defaultBaseUrl: "http://127.0.0.1:18100",
    defaultOpenapiRelativePath: "app-api/mcp/mcp-app-api.openapi.json",
    sdkName: "sdkwork-mcp-app-sdk",
    sdkRoot: resolveFamilySdkRoot(import.meta.url),
    sdkType: "app",
  },
  process.argv.slice(2),
);
