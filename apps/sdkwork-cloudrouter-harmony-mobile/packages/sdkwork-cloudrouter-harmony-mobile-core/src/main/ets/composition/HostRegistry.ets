/**
 * Host adapter capability registry.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 7. Renderer and
 * feature code routes through the declared capability set; direct platform
 * branches on HarmonyOS globals are forbidden.
 */
export const cloudRouterHarmonyHostCapabilities: string[] = [
  'secureStorage',
  'networkStatus',
  'appLifecycle',
  'deepLinks',
  'filePicker',
  'qrScanner',
  'pushNotifications',
  'clipboard',
  'deviceInfo',
];

export function hasCloudRouterHarmonyHostCapability(capability: string): boolean {
  return cloudRouterHarmonyHostCapabilities.includes(capability);
}
