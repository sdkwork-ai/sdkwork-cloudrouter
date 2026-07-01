export interface SdkworkSdkInventoryEntry {
  workspace: string;
  surface: string;
  credentialMode: string;
}

export function listSdkworkAdminCoreSdkInventory(): readonly SdkworkSdkInventoryEntry[] {
  return [
    { workspace: 'clawrouter-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
    { workspace: 'sdkwork-iam-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
    { workspace: 'sdkwork-models-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
    { workspace: 'clawrouter-backend-domain-transport-generated-typescript', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
  ] as const;
}
