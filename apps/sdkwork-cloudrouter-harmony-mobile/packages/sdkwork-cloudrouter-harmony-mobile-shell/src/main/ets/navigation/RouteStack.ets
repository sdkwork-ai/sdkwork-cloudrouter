/**
 * Page/route stack assembly for the HarmonyOS shell.
 *
 * Route ids follow `<surface>.<domain>.<capability>.<screen>` and are the
 * canonical Cloud Router console route ids from
 * `@sdkwork/cloudrouter-contracts`. Physical Harmony page paths may differ
 * from other platforms while route ids stay aligned.
 *
 * Route metadata must not declare HTTP API paths, SDK methods, raw URL
 * constants, or transport details.
 */
export interface CloudRouterHarmonyRouteRegistration {
  readonly id: string;
  readonly surface: 'console';
  readonly capability: string;
  readonly screen: string;
  readonly pagePath: string;
  readonly titleKey: string;
  readonly auth: 'public' | 'required';
  readonly permissionHint?: string;
  readonly order: number;
}

export function createCloudRouterHarmonyRouteStack(
  routes: CloudRouterHarmonyRouteRegistration[],
): CloudRouterHarmonyRouteRegistration[] {
  return routes
    .filter((route) => route.pagePath.trim().length > 0 && route.id.trim().length > 0)
    .sort((left, right) => left.order - right.order);
}
