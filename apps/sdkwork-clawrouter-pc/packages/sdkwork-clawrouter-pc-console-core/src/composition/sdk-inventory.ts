export interface SdkworkSdkInventoryEntry {
  workspace: string;
  surface: string;
  credentialMode: string;
}

export function listSdkworkConsoleCoreSdkInventory(): readonly SdkworkSdkInventoryEntry[] {
  return [
    { workspace: 'clawrouter-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'sdkwork-iam-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-wallet-capability', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-membership-capability', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-promotion-capability', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-order-capability', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-payment-capability', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-catalog-capability', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    { workspace: 'clawrouter-app-domain-transport-generated-typescript', surface: 'app-api', credentialMode: 'authenticated-app-api' },
  ] as const;
}
