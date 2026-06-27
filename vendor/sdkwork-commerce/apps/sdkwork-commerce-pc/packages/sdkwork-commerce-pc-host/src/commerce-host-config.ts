export interface SdkworkCommerceHostConfig {
  routePrefix?: string;
}

export interface SdkworkCommerceHostPaths {
  checkoutPath: string;
  membershipsPath: string;
  paymentPath: string;
  routePrefix: string;
  walletPath: string;
}

function normalizeRoutePrefix(routePrefix: string | undefined): string {
  const normalized = (routePrefix ?? "/console").trim();
  if (!normalized || normalized === "/") {
    return "/console";
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function resolveCommerceHostPaths(
  config?: SdkworkCommerceHostConfig,
): SdkworkCommerceHostPaths {
  const routePrefix = normalizeRoutePrefix(config?.routePrefix);

  return {
    routePrefix,
    walletPath: `${routePrefix}/wallet`,
    membershipsPath: `${routePrefix}/memberships`,
    checkoutPath: `${routePrefix}/checkout`,
    paymentPath: `${routePrefix}/payment`,
  };
}
