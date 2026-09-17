import {
  CLOUDROUTER_CONSOLE_CAPABILITIES,
  CLOUDROUTER_CONSOLE_ROUTES,
  type CloudRouterConsoleRouteKey,
} from '@sdkwork/cloudrouter-contracts';

export interface ConsoleNavigationEntry {
  readonly key: CloudRouterConsoleRouteKey;
  readonly path: string;
  readonly labelKey: string;
  readonly icon: 'dashboard' | 'usage' | 'key' | 'catalog';
  readonly order: number;
}

/** Console navigation is derived from the shared capability descriptors. */
export const CONSOLE_NAVIGATION: readonly ConsoleNavigationEntry[] = CLOUDROUTER_CONSOLE_CAPABILITIES.map(
  (capability) => ({
    key: capability.routeKey,
    path: CLOUDROUTER_CONSOLE_ROUTES[capability.routeKey].path,
    labelKey: capability.titleKey,
    icon:
      capability.routeKey === 'dashboard'
        ? 'dashboard'
        : capability.routeKey === 'usage'
          ? 'usage'
          : capability.routeKey === 'apiKeys'
            ? 'key'
            : 'catalog',
    order: capability.order,
  }),
);

export function findConsoleNavigationEntry(path: string): ConsoleNavigationEntry | undefined {
  return CONSOLE_NAVIGATION.find((entry) => entry.path === path);
}
