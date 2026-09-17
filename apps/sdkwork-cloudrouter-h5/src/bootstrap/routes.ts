import { CLOUDROUTER_CONSOLE_ROUTE_ORDER, CLOUDROUTER_CONSOLE_ROUTES } from '@sdkwork/cloudrouter-contracts';

export interface CloudRouterH5RouteEntry {
  readonly key: string;
  readonly id: string;
  readonly path: string;
}

/** Route assembly metadata consumed by the app root router. */
export function createRoutes(): readonly CloudRouterH5RouteEntry[] {
  return CLOUDROUTER_CONSOLE_ROUTE_ORDER.map((key) => ({
    key,
    id: CLOUDROUTER_CONSOLE_ROUTES[key].id,
    path: CLOUDROUTER_CONSOLE_ROUTES[key].path,
  }));
}
