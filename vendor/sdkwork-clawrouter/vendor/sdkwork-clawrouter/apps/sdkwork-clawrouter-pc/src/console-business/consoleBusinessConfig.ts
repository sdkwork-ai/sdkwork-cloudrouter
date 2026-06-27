export interface ClawRouterConsoleBusinessHostConfig {
  routePrefix?: string;
}

export interface ClawRouterConsoleBusinessHostPaths {
  accountPath: string;
  checkoutPath: string;
  couponsPath: string;
  membershipsPath: string;
  paymentPath: string;
  routePrefix: string;
  settlementsPath: string;
  walletPath: string;
}

function normalizeRoutePrefix(routePrefix: string | undefined): string {
  const normalized = (routePrefix ?? '/console').trim();
  if (!normalized || normalized === '/') {
    return '/console';
  }

  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

export function resolveConsoleBusinessHostPaths(
  config?: ClawRouterConsoleBusinessHostConfig,
): ClawRouterConsoleBusinessHostPaths {
  const routePrefix = normalizeRoutePrefix(config?.routePrefix);

  return {
    routePrefix,
    accountPath: `${routePrefix}/account`,
    walletPath: `${routePrefix}/wallet`,
    couponsPath: `${routePrefix}/coupons`,
    membershipsPath: `${routePrefix}/memberships`,
    settlementsPath: `${routePrefix}/settlements`,
    checkoutPath: `${routePrefix}/checkout`,
    paymentPath: `${routePrefix}/payment`,
  };
}
