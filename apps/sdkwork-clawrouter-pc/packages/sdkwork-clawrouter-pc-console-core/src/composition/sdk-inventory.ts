export interface SdkworkSdkInventoryEntry {
  workspace: string;
  surface: string;
  credentialMode: string;
}

export function listSdkworkConsoleCoreSdkInventory(): readonly SdkworkSdkInventoryEntry[] {
  return [
    { workspace: 'clawrouter-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'sdkwork-iam-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'sdkwork-account-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'sdkwork-catalog-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'sdkwork-membership-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'sdkwork-order-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'sdkwork-payment-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'sdkwork-promotion-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
  ] as const;
}
