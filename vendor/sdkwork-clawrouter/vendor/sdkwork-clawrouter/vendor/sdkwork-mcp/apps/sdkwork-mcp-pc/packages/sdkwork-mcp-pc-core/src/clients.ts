import { createClient as createDriveSdkClient, type SdkworkDriveAppClient } from '@sdkwork/drive-app-sdk';
import type { AuthTokenManager } from '@sdkwork/sdk-common';
import { createClient as createAppSdkClient, type SdkworkAppClient } from 'sdkwork-mcp-app-sdk-generated-typescript/src/sdk';
import {
  createClient as createBackendSdkClient,
  type SdkworkBackendClient,
} from 'sdkwork-mcp-backend-sdk-generated-typescript/src/sdk';
import { isBlank, trim } from '@sdkwork/utils';
import { normalizeApiBaseUrl, readRuntimeEnv } from '@sdkwork/mcp-pc-commons/runtime';

import { createMCPTokenManager } from './session';

export type MCPClientConfig = {
  appApiBaseUrl?: string;
  backendApiBaseUrl?: string;
  driveAppApiBaseUrl?: string;
  tenantId?: string;
  tokenManager?: AuthTokenManager;
};

export type MCPClients = {
  app: SdkworkAppClient;
  backend: SdkworkBackendClient;
  drive: SdkworkDriveAppClient;
};

let cachedClients: MCPClients | null = null;

function resolveAppApiBaseUrl(config?: MCPClientConfig): string {
  return normalizeApiBaseUrl(
    config?.appApiBaseUrl ?? readRuntimeEnv('VITE_SDKWORK_MCP_APP_API_BASE_URL') ?? '',
  );
}

function resolveBackendApiBaseUrl(config?: MCPClientConfig): string {
  return normalizeApiBaseUrl(
    config?.backendApiBaseUrl ?? readRuntimeEnv('VITE_SDKWORK_MCP_BACKEND_API_BASE_URL') ?? '',
  );
}

function resolveDriveAppApiBaseUrl(config?: MCPClientConfig): string {
  return normalizeApiBaseUrl(
    config?.driveAppApiBaseUrl ??
      readRuntimeEnv('VITE_SDKWORK_DRIVE_APP_API_BASE_URL') ??
      readRuntimeEnv('VITE_SDKWORK_MCP_APP_API_BASE_URL') ??
      '',
  );
}

function resolveTenantHeader(config?: MCPClientConfig): string {
  const tenantId = trim(config?.tenantId ?? readRuntimeEnv('VITE_SDKWORK_MCP_TENANT_ID') ?? '100001');
  return isBlank(tenantId) ? '100001' : tenantId;
}

function createAuthenticatedClientConfig(
  config: MCPClientConfig,
  baseUrl: string,
  tokenManager: AuthTokenManager,
) {
  return {
    baseUrl,
    authMode: 'dual-token' as const,
    platform: 'pc' as const,
    headers: {
      'x-sdkwork-tenant-id': resolveTenantHeader(config),
    },
    tokenManager,
  };
}

export function createMCPClients(config: MCPClientConfig = {}): MCPClients {
  const tokenManager = config.tokenManager ?? createMCPTokenManager();

  const app = createAppSdkClient(
    createAuthenticatedClientConfig(config, resolveAppApiBaseUrl(config), tokenManager),
  );
  app.setTokenManager(tokenManager);

  const backend = createBackendSdkClient(
    createAuthenticatedClientConfig(config, resolveBackendApiBaseUrl(config), tokenManager),
  );
  backend.setTokenManager(tokenManager);

  const drive = createDriveSdkClient(
    createAuthenticatedClientConfig(config, resolveDriveAppApiBaseUrl(config), tokenManager),
  );
  drive.setTokenManager(tokenManager);

  return { app, backend, drive };
}

export function getMCPClients(): MCPClients {
  if (!cachedClients) {
    cachedClients = createMCPClients();
  }
  return cachedClients;
}

export function resetMCPClients(): void {
  cachedClients = null;
}
