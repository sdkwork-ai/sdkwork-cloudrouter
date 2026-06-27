import {
  resolveCommerceHostPaths,
  type SdkworkCommerceHostConfig,
} from "./commerce-host-config.ts";

export function mapCommerceRouteToHost(
  route: string,
  config?: SdkworkCommerceHostConfig,
): string {
  const { routePrefix } = resolveCommerceHostPaths(config);

  if (route.startsWith(`${routePrefix}/`) || route === routePrefix) {
    return route;
  }

  try {
    const url = new URL(route, "https://sdkwork.local");
    const pathname = url.pathname;
    const suffix = `${url.search}${url.hash}`;

    if (pathname.startsWith("/app/")) {
      return `${routePrefix}${pathname.slice("/app".length)}${suffix}`;
    }

    if (pathname === "/checkout" || pathname.startsWith("/checkout/")) {
      return `${routePrefix}${pathname}${suffix}`;
    }

    if (pathname === "/payments" || pathname.startsWith("/payments/")) {
      const paymentPath = pathname === "/payments"
        ? "/payment"
        : `/payment${pathname.slice("/payments".length)}`;
      return `${routePrefix}${paymentPath}${suffix}`;
    }

    if (pathname.startsWith("/memberships")) {
      return `${routePrefix}/memberships${suffix}`;
    }

    if (pathname.startsWith("/wallet")) {
      return `${routePrefix}/wallet${suffix}`;
    }

    if (pathname.startsWith("/")) {
      return `${routePrefix}${pathname}${suffix}`;
    }
  } catch {
    return route;
  }

  return route.startsWith("/") ? `${routePrefix}${route}` : route;
}

export function createCommerceHostNavigator(
  navigate: (route: string) => void,
  config?: SdkworkCommerceHostConfig,
): (route: string) => void {
  return (route: string) => {
    navigate(mapCommerceRouteToHost(route, config));
  };
}
