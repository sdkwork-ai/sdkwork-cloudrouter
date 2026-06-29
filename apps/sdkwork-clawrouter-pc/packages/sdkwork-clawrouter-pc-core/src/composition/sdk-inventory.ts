
export type SdkworkDependencyCompositionManifest = typeof compositionManifest;

export type SdkworkDependencyCompositionSdkClient =
  SdkworkDependencyCompositionManifest['surfaces'][number]['sdkClients'][number];

export type SdkworkPermissionComposition =
  NonNullable<SdkworkDependencyCompositionManifest['permissionComposition']>;

const APP_SURFACE = compositionManifest.surfaces.find((entry) => entry.surface === 'app');

export function listSdkworkCoreSdkInventory(): readonly SdkworkDependencyCompositionSdkClient[] {
  return APP_SURFACE?.sdkClients ?? [];
}

export function readSdkworkCorePermissionComposition(): SdkworkPermissionComposition | undefined {
  return compositionManifest.permissionComposition;
}
