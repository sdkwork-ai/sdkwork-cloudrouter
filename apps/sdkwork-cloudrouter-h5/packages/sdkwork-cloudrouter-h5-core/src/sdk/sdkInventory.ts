export interface SdkworkH5SdkInventoryEntry {
  readonly workspace: string;
  readonly surface: string;
  readonly credentialMode: string;
  readonly apiPrefix: string;
}

/**
 * SDK inventory derived from `specs/component.spec.json#contracts.sdkDependencies`.
 * Bootstrap must not keep a second handwritten inventory, so this list is the
 * machine-readable projection of the core contract.
 */
export const SDKWORK_H5_SDK_INVENTORY: readonly SdkworkH5SdkInventoryEntry[] = [
  {
    workspace: 'cloudrouter-app-sdk',
    surface: 'app-api',
    credentialMode: 'authenticated-app-api',
    apiPrefix: '/app/v3/api',
  },
];

export function listSdkworkH5SdkInventory(): readonly SdkworkH5SdkInventoryEntry[] {
  return SDKWORK_H5_SDK_INVENTORY;
}
