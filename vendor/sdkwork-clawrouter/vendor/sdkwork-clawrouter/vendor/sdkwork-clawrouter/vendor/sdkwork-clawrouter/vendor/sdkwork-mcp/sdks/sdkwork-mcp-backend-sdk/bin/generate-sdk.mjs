#!/usr/bin/env node
import { resolveFamilySdkRoot, runMcpSdkGenerator } from "../../../tools/mcp_sdk_generator_runner.mjs";

runMcpSdkGenerator(
  {
    apiAuthority: "sdkwork-mcp.backend",
    apiPrefix: "/backend/v3/api",
    defaultBaseUrl: "http://127.0.0.1:18101",
    defaultOpenapiRelativePath: "backend-api/mcp/mcp-backend-api.openapi.json",
    sdkName: "sdkwork-mcp-backend-sdk",
    sdkRoot: resolveFamilySdkRoot(import.meta.url),
    sdkType: "backend",
  },
  process.argv.slice(2),
);
