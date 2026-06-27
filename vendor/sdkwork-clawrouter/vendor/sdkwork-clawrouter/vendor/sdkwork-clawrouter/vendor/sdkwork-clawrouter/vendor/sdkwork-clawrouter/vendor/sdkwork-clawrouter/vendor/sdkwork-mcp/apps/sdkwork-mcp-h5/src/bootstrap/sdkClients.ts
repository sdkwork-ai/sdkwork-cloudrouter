import { createClient as createDriveSdkClient, type SdkworkDriveAppClient } from "@sdkwork/drive-app-sdk";
import {
  createMCPAppSdkClientConfig,
  getMCPAppSdkClient,
  initMCPAppSdkClient,
  type SdkworkMCPAppClient,
} from "@sdkwork/mcp-h5-core/sdk/mcpAppSdkClient";
import { getSdkworkChatGlobalTokenManager } from "@sdkwork/mcp-h5-core/session";

import { resolveEnvironment } from "./environment";

export interface SdkworkMcpH5SdkClientInventory {
  apiBaseUrl: string;
  backendApiBaseUrl: string;
  driveAppApiBaseUrl: string;
  app: SdkworkMCPAppClient;
  drive: SdkworkDriveAppClient;
  sdkFamilies: {
    app: string[];
    drive: string[];
  };
}

export function bootstrapSdkClients(): SdkworkMcpH5SdkClientInventory {
  const environment = resolveEnvironment();
  const tokenManager = getSdkworkChatGlobalTokenManager();

  initMCPAppSdkClient(createMCPAppSdkClientConfig());

  const drive = createDriveSdkClient({
    authMode: "dual-token",
    baseUrl: environment.driveAppApiBaseUrl.replace(/\/app\/v3\/api$/u, ""),
    platform: "h5",
    tokenManager,
  });
  drive.setTokenManager(tokenManager);

  return {
    apiBaseUrl: environment.apiBaseUrl,
    backendApiBaseUrl: environment.backendApiBaseUrl,
    driveAppApiBaseUrl: environment.driveAppApiBaseUrl,
    app: getMCPAppSdkClient(),
    drive,
    sdkFamilies: {
      app: ["sdkwork-mcp-app-sdk"],
      drive: ["sdkwork-drive-app-sdk"],
    },
  };
}
