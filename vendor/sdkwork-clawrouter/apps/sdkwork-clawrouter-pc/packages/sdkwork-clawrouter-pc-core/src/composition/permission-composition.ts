import compositionManifest from '../../../../specs/dependency.composition.json';

export type SdkworkPermissionCompositionOverride =
  NonNullable<
    NonNullable<
      typeof compositionManifest.permissionComposition
    >['routePermissionHints']
  >['overrides'][number];

export function readSdkworkPermissionCompositionOverrides(): readonly SdkworkPermissionCompositionOverride[] {
  return compositionManifest.permissionComposition?.routePermissionHints?.overrides ?? [];
}

export function resolveSdkworkPermissionCodeReplacement(permissionCode: string): string {
  for (const override of readSdkworkPermissionCompositionOverrides()) {
    if (override.kind === 'permission-code-replacement' && override.from === permissionCode) {
      return override.to;
    }
  }
  return permissionCode;
}

export function resolveSdkworkEffectivePermissionCodes(codes: readonly string[]): string[] {
  return codes.map((code) => resolveSdkworkPermissionCodeReplacement(code));
}
