
export type SdkworkDependencyCompositionManifest = typeof compositionManifest;

export type SdkworkDependencyCompositionSdkClient =
  SdkworkDependencyCompositionManifest['surfaces'][number]['sdkClients'][number];

const CONSOLE_SURFACE = compositionManifest.surfaces.find((entry) => entry.surface === 'console');

export function listSdkworkConsoleCoreSdkInventory(): readonly SdkworkDependencyCompositionSdkClient[] {
  return CONSOLE_SURFACE?.sdkClients ?? [];
}
