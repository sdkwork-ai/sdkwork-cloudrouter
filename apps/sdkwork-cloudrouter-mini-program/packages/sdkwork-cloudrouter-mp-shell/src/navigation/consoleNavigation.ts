import {
  CLOUDROUTER_CONSOLE_TABS,
  type CloudRouterConsoleTabDescriptor,
} from '@sdkwork/cloudrouter-contracts';

/**
 * Tab bar entries for the WeChat root.
 *
 * The order, paths, and title keys are derived from the shared
 * `CLOUDROUTER_CONSOLE_TABS` authority so a user moving between roots sees a
 * stable sequence; only the platform projection (page path and icon pair) is
 * mini-program specific. Per `APP_MINI_PROGRAM_UI_SPEC.md` section 7 each tab
 * ships an outline/filled icon pair of the same glyph and the native
 * `iconPath`/`selectedIconPath` slots carry them in `src/app.json`.
 */
export interface CloudRouterMpTabBarEntry {
  readonly routeKey: CloudRouterConsoleTabDescriptor['routeKey'];
  readonly pagePath: string;
  readonly titleKey: string;
  readonly glyph: CloudRouterConsoleTabDescriptor['glyph'];
  readonly iconPath: string;
  readonly selectedIconPath: string;
}

const ICON_PATHS: Record<CloudRouterConsoleTabDescriptor['glyph'], { outline: string; filled: string }> = {
  dashboard: {
    outline: 'images/tabbar/dashboard-outline.png',
    filled: 'images/tabbar/dashboard-filled.png',
  },
  receipt: {
    outline: 'images/tabbar/usage-outline.png',
    filled: 'images/tabbar/usage-filled.png',
  },
  key: {
    outline: 'images/tabbar/api-keys-outline.png',
    filled: 'images/tabbar/api-keys-filled.png',
  },
  barChart: {
    outline: 'images/tabbar/catalog-outline.png',
    filled: 'images/tabbar/catalog-filled.png',
  },
};

export const CLOUDROUTER_MP_TAB_BAR: readonly CloudRouterMpTabBarEntry[] = CLOUDROUTER_CONSOLE_TABS.map(
  (tab) => ({
    routeKey: tab.routeKey,
    pagePath: `pages/${tab.routeKey === 'apiKeys' ? 'api-keys' : tab.routeKey}/index`,
    titleKey: tab.titleKey,
    glyph: tab.glyph,
    iconPath: ICON_PATHS[tab.glyph].outline,
    selectedIconPath: ICON_PATHS[tab.glyph].filled,
  }),
);
