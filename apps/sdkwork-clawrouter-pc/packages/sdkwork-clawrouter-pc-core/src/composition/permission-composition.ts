export type SdkworkPermissionCompositionOverride = {
  kind: string;
  from?: string;
  to?: string;
  scope?: string;
  reason?: string;
};

export function readSdkworkPermissionCompositionOverrides(): readonly SdkworkPermissionCompositionOverride[] {
  return [];
}

export function resolveSdkworkPermissionCodeReplacement(permissionCode: string): string {
  for (const override of readSdkworkPermissionCompositionOverrides()) {
    if (override.kind === 'permission-code-replacement' && override.from === permissionCode) {
      return override.to ?? permissionCode;
    }
  }
  return permissionCode;
}

export function resolveSdkworkEffectivePermissionCodes(codes: readonly string[]): string[] {
  return codes.map((code) => resolveSdkworkPermissionCodeReplacement(code));
}
