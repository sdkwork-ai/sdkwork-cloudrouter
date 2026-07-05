export interface SdkworkSdkInventoryEntry {
  workspace: string;
  surface: string;
  credentialMode: string;
}

export function listSdkworkCoreSdkInventory(): readonly SdkworkSdkInventoryEntry[] {
  return [
    { workspace: 'clawrouter-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-open-sdk', surface: 'open-api', credentialMode: 'protected-open-api-flexible' },
    { workspace: 'sdkwork-iam-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-wallet-capability', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-membership-capability', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-promotion-capability', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-order-capability', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-payment-capability', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-catalog-capability', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api', exportSubpath: 'domains' },
  ] as const;
}

export function readSdkworkCorePermissionComposition() {
  return undefined;
}
