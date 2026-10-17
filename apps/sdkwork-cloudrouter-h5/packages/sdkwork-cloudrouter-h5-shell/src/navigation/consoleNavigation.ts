import {
  CLOUDROUTER_CONSOLE_TABS,
  type CloudRouterConsoleRouteKey,
  type CloudRouterConsoleTabDescriptor,
} from '@sdkwork/cloudrouter-contracts';

export interface ConsoleNavigationEntry {
  readonly key: CloudRouterConsoleRouteKey;
  readonly path: string;
  readonly labelKey: string;
  readonly icon: 'dashboard' | 'usage' | 'key' | 'catalog';
  readonly order: number;
}

/**
 * Console navigation is derived from the shared console tab descriptors
 * (`CLOUDROUTER_CONSOLE_TABS`), the same single authority the mini program and
 * Flutter roots derive their tab bars from. The tab order therefore stays
 * identical on every root; only the glyph-to-icon projection below is
 * H5-specific (`APP_MOBILE_REACT_UI_SPEC.md` section 5).
 */
const ICON_BY_GLYPH: Record<CloudRouterConsoleTabDescriptor['glyph'], ConsoleNavigationEntry['icon']> = {
  dashboard: 'dashboard',
  receipt: 'usage',
  key: 'key',
  barChart: 'catalog',
};

export const CONSOLE_NAVIGATION: readonly ConsoleNavigationEntry[] = CLOUDROUTER_CONSOLE_TABS.map(
  (tab, index) => ({
    key: tab.routeKey,
    path: tab.path,
    labelKey: tab.titleKey,
    icon: ICON_BY_GLYPH[tab.glyph],
    order: (index + 1) * 10,
  }),
);

export function findConsoleNavigationEntry(path: string): ConsoleNavigationEntry | undefined {
  return CONSOLE_NAVIGATION.find((entry) => entry.path === path);
}
