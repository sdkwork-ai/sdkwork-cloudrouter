export interface SdkworkSdkInventoryEntry {
  workspace: string;
  surface: string;
  credentialMode: string;
}

export function listSdkworkAdminCoreSdkInventory(): readonly SdkworkSdkInventoryEntry[] {
  return [
    { workspace: 'clawrouter-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
    { workspace: 'sdkwork-models-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
  ] as const;
}
