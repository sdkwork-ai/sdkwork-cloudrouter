export interface SdkworkSdkInventoryEntry {
  workspace: string;
  surface: string;
  credentialMode: string;
}

/**
 * H5 SDK inventory. The H5 root is a user-facing console surface, so it consumes
 * the generated app SDK only; backend/operator SDKs belong to the PC
 * backend-admin surface.
 */
export function listSdkworkH5CoreSdkInventory(): readonly SdkworkSdkInventoryEntry[] {
  return [
    { workspace: 'cloudrouter-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
  ] as const;
}
