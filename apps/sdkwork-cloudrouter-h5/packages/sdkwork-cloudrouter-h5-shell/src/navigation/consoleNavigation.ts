import {
  CLOUDROUTER_CONSOLE_TABS,
  type CloudRouterConsoleRouteKey,
  type CloudRouterConsoleTabDescriptor,
} from '@sdkwork/cloudrouter-contracts';

/** Shell tab keys: the shared console tabs plus H5-only messages/playground/profile. */
export type ConsoleNavigationKey = CloudRouterConsoleRouteKey | 'messages' | 'playground' | 'profile';

export interface ConsoleNavigationEntry {
  readonly key: ConsoleNavigationKey;
  readonly path: string;
  readonly labelKey: string;
  readonly icon: 'dashboard' | 'usage' | 'key' | 'catalog' | 'messages' | 'playground' | 'profile';
  readonly order: number;
}

/**
 * Console navigation is derived from the shared console tab descriptors
 * (`CLOUDROUTER_CONSOLE_TABS`), the same single authority the mini program and
 * Flutter roots derive their tab bars from, so the console tabs keep the same
 * identity on every root.
 *
 * H5 host decisions (`APP_MOBILE_REACT_UI_SPEC.md` section 5):
 * - API Key and Usage are developer/billing tools, not primary mobile
 *   destinations. Both stay mounted routes reachable from the home primary
 *   actions and service grid, but are filtered out of the H5 tab bar.
 * - Messages is the SDKWork IM H5 conversation list.
 * - Playground is the Agents H5 chat composition.
 * - Profile is the account tab.
 * The shared tab contract itself is unchanged.
 */
const ICON_BY_GLYPH: Record<CloudRouterConsoleTabDescriptor['glyph'], ConsoleNavigationEntry['icon']> = {
  dashboard: 'dashboard',
  receipt: 'usage',
  key: 'key',
  barChart: 'catalog',
};

const CONSOLE_TAB_ENTRIES: readonly ConsoleNavigationEntry[] = CLOUDROUTER_CONSOLE_TABS
  .filter((tab) => tab.routeKey !== 'apiKeys' && tab.routeKey !== 'usage')
  .map((tab) => ({
    key: tab.routeKey,
    path: tab.path,
    // The overview tab is the mobile cloud app's home screen; the shared
    // descriptor's page title ("Overview") stays the authenticated page header.
    labelKey: tab.routeKey === 'dashboard' ? 'cloudrouter.console.shared.homeTab' : tab.titleKey,
    icon: ICON_BY_GLYPH[tab.glyph],
    // Home is first; the remaining shared tab (catalog) follows Playground.
    order: tab.routeKey === 'dashboard' ? 10 : 30,
  }));

export const CONSOLE_NAVIGATION: readonly ConsoleNavigationEntry[] = [
  ...CONSOLE_TAB_ENTRIES,
  {
    key: 'messages',
    path: '/messages',
    labelKey: 'cloudrouter.console.shared.messagesTab',
    icon: 'messages',
    order: 40,
  },
  {
    key: 'playground',
    path: '/playground',
    labelKey: 'cloudrouter.console.shared.playgroundTab',
    icon: 'playground',
    order: 20,
  },
  {
    key: 'profile',
    path: '/me',
    labelKey: 'cloudrouter.console.shared.profileTab',
    icon: 'profile',
    order: 50,
  },
];

export function findConsoleNavigationEntry(path: string): ConsoleNavigationEntry | undefined {
  return CONSOLE_NAVIGATION.find((entry) => entry.path === path);
}
