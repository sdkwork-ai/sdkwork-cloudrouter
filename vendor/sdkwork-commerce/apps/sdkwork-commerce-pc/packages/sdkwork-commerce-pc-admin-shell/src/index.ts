import {
  sdkworkCommercePcAdminRuntimeBoundary,
  type SdkworkCommercePcAdminSurface,
} from "@sdkwork/commerce-pc-admin-core";

export type { SdkworkCommercePcAdminSurface } from "@sdkwork/commerce-pc-admin-core";

export interface SdkworkCommercePcAdminRouteContribution {
  readonly id: string;
  readonly path: string;
  readonly permissionHint?: string;
  readonly surface: SdkworkCommercePcAdminSurface;
  readonly title: string;
}

export const sdkworkCommercePcAdminShell = {
  navigationLabel: "Commerce Admin",
  routePrefix: sdkworkCommercePcAdminRuntimeBoundary.routePrefix,
  surface: sdkworkCommercePcAdminRuntimeBoundary.surface,
} as const;

export function isSdkworkCommercePcBackendAdminRoute(route: { readonly surface: string }): boolean {
  return route.surface === sdkworkCommercePcAdminRuntimeBoundary.surface;
}

export function getSdkworkCommercePcBackendAdminRoutes<T extends { readonly surface: string }>(
  routes: readonly T[],
): readonly T[] {
  return routes.filter(isSdkworkCommercePcBackendAdminRoute);
}
