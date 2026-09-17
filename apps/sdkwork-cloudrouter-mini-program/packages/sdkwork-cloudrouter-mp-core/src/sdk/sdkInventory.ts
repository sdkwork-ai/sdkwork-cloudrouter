export interface SdkworkMpSdkInventoryEntry {
  readonly workspace: string;
  readonly surface: string;
  readonly credentialMode: string;
  readonly apiPrefix: string;
}

/**
 * SDK inventory derived from `specs/component.spec.json#contracts.sdkDependencies`.
 * Bootstrap must not keep a second handwritten inventory.
 */
export const SDKWORK_MP_SDK_INVENTORY: readonly SdkworkMpSdkInventoryEntry[] = [
  {
    workspace: 'cloudrouter-app-sdk',
    surface: 'app-api',
    credentialMode: 'authenticated-app-api',
    apiPrefix: '/app/v3/api',
  },
];

export function listSdkworkMpSdkInventory(): readonly SdkworkMpSdkInventoryEntry[] {
  return SDKWORK_MP_SDK_INVENTORY;
}
