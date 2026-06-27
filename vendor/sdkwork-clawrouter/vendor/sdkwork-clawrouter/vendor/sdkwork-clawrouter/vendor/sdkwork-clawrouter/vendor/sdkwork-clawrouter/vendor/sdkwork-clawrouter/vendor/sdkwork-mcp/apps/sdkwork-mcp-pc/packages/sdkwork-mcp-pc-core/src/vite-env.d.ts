/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SDKWORK_MCP_APP_API_BASE_URL?: string;
  readonly VITE_SDKWORK_MCP_BACKEND_API_BASE_URL?: string;
  readonly VITE_SDKWORK_MCP_TENANT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
