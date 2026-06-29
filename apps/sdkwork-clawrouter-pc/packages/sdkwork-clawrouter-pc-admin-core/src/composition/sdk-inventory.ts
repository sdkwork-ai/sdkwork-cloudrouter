
export type SdkworkDependencyCompositionManifest = typeof compositionManifest;

export type SdkworkDependencyCompositionSdkClient =
  SdkworkDependencyCompositionManifest['surfaces'][number]['sdkClients'][number];

const ADMIN_SURFACE = compositionManifest.surfaces.find((entry) => entry.surface === 'backend-admin');

export function listSdkworkAdminCoreSdkInventory(): readonly SdkworkDependencyCompositionSdkClient[] {
  return ADMIN_SURFACE?.sdkClients ?? [];
}
