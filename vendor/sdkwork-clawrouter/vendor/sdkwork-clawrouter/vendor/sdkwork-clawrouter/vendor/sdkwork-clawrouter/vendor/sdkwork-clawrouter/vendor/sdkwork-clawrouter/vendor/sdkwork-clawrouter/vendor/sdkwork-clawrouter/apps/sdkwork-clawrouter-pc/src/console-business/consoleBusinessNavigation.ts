import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  resolveConsoleBusinessHostPaths,
  type ClawRouterConsoleBusinessHostConfig,
  type ClawRouterConsoleBusinessHostPaths,
} from './consoleBusinessConfig.ts';

export interface ClawRouterConsoleBusinessNavigation
  extends ClawRouterConsoleBusinessHostPaths {
  onNavigate: (route: string) => void;
  paths: ClawRouterConsoleBusinessHostPaths;
}

export function mapConsoleBusinessRouteToHost(
  route: string,
  config?: ClawRouterConsoleBusinessHostConfig,
): string {
  const { routePrefix } = resolveConsoleBusinessHostPaths(config);

  if (route.startsWith(`${routePrefix}/`) || route === routePrefix) {
    return route;
  }

  try {
    const url = new URL(route, 'https://sdkwork.local');
    const pathname = url.pathname;
    const suffix = `${url.search}${url.hash}`;

    if (pathname.startsWith('/app/')) {
      return `${routePrefix}${pathname.slice('/app'.length)}${suffix}`;
    }

    if (pathname === '/checkout' || pathname.startsWith('/checkout/')) {
      return `${routePrefix}${pathname}${suffix}`;
    }

    if (pathname === '/payments' || pathname.startsWith('/payments/')) {
      const paymentPath = pathname === '/payments'
        ? '/payment'
        : `/payment${pathname.slice('/payments'.length)}`;
      return `${routePrefix}${paymentPath}${suffix}`;
    }

    if (pathname.startsWith('/memberships')) {
      return `${routePrefix}/memberships${suffix}`;
    }

    if (pathname.startsWith('/wallet')) {
      return `${routePrefix}/wallet${suffix}`;
    }

    if (pathname.startsWith('/coupon') || pathname.startsWith('/coupons')) {
      return `${routePrefix}/coupons${suffix}`;
    }

    if (pathname.startsWith('/orders')) {
      return `${routePrefix}/settlements${suffix}`;
    }

    if (pathname.startsWith('/')) {
      return `${routePrefix}${pathname}${suffix}`;
    }
  } catch {
    return route;
  }

  return route.startsWith('/') ? `${routePrefix}${route}` : route;
}

export function createConsoleBusinessNavigator(
  navigate: (route: string) => void,
  config?: ClawRouterConsoleBusinessHostConfig,
): (route: string) => void {
  return (route: string) => {
    navigate(mapConsoleBusinessRouteToHost(route, config));
  };
}

export function useConsoleBusinessNavigation(
  config?: ClawRouterConsoleBusinessHostConfig,
): ClawRouterConsoleBusinessNavigation {
  const navigate = useNavigate();
  const paths = useMemo(() => resolveConsoleBusinessHostPaths(config), [config?.routePrefix]);
  const onNavigate = useCallback(
    createConsoleBusinessNavigator(navigate, config),
    [config?.routePrefix, navigate],
  );

  return {
    ...paths,
    onNavigate,
    paths,
  };
}
