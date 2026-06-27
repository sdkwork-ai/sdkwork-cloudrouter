export interface SdkworkCommercePcNavigationRoute {
  readonly id: string;
  readonly path: string;
  readonly surface: string;
  readonly title: string;
}

export const sdkworkCommercePcBrand = {
  mark: "SC",
  name: "SDKWork Commerce PC",
} as const;

export function getSdkworkCommercePcAppRoutes<T extends SdkworkCommercePcNavigationRoute>(
  routes: readonly T[],
): readonly T[] {
  return routes.filter((route) => route.surface === "app");
}

export function getSdkworkCommercePcBackendAdminRoutes<T extends SdkworkCommercePcNavigationRoute>(
  routes: readonly T[],
): readonly T[] {
  return routes.filter((route) => route.surface === "backend-admin");
}
