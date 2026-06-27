import type { SdkworkAppClient as MCPAppClient } from 'sdkwork-mcp-app-sdk-generated-typescript/src/sdk';
import type { SdkworkBackendClient } from 'sdkwork-mcp-backend-sdk-generated-typescript/src/sdk';
import type { SdkworkDriveAppClient } from '@sdkwork/drive-app-sdk';

export interface SdkworkMCPPcSdkClientInventory {
  appApiBaseUrl: string;
  backendApiBaseUrl: string;
  driveAppApiBaseUrl: string;
  app: MCPAppClient;
  backend: SdkworkBackendClient;
  drive: SdkworkDriveAppClient;
  sdkFamilies: {
    app: string[];
    backend: string[];
  };
}
