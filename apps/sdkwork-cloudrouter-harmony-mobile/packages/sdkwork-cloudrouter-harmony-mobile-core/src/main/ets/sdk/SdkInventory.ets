/**
 * SDK client packages consumed by Harmony core.
 *
 * Authority: `specs/component.spec.json` `contracts.sdkDependencies`.
 */
export interface CloudRouterHarmonySdkInventoryEntry {
  readonly workspace: string;
  readonly surface: string;
  readonly credentialMode: string;
  readonly runtimeAdaptation: string;
}

export const cloudRouterHarmonyCoreSdkInventory: CloudRouterHarmonySdkInventoryEntry[] = [
  {
    workspace: 'cloudrouter-app-sdk',
    surface: 'app-api',
    credentialMode: 'authenticated-app-api',
    runtimeAdaptation: 'arkts-pending',
  },
];

export function listSdkworkCoreSdkInventory(): CloudRouterHarmonySdkInventoryEntry[] {
  return cloudRouterHarmonyCoreSdkInventory;
}
