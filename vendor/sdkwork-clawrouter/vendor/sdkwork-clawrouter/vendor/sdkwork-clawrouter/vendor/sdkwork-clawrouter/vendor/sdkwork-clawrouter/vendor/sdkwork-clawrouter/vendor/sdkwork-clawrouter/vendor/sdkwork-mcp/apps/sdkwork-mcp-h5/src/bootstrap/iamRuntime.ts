import { readAppSdkSessionTokens } from "@sdkwork/mcp-h5-core/session";

import { bootstrapSdkClients, type SdkworkMcpH5SdkClientInventory } from "./sdkClients";

export interface SdkworkMcpH5IamRuntime {
  session: ReturnType<typeof readAppSdkSessionTokens>;
  sdkClients: SdkworkMcpH5SdkClientInventory;
}

let iamRuntime: SdkworkMcpH5IamRuntime | null = null;

export function createIamRuntime(): SdkworkMcpH5IamRuntime {
  const sdkClients = bootstrapSdkClients();
  iamRuntime = {
    session: readAppSdkSessionTokens(),
    sdkClients,
  };
  return iamRuntime;
}

export function getIamRuntime(): SdkworkMcpH5IamRuntime | null {
  return iamRuntime;
}
