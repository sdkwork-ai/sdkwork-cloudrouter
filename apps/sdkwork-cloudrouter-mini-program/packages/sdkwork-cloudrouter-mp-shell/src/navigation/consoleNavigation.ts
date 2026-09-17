import { CLOUDROUTER_CONSOLE_ROUTES } from '@sdkwork/cloudrouter-contracts';

/**
 * Tab bar entries mirroring the PC console navigation, ordered the same way so a
 * user moving between roots sees a stable sequence.
 */
export const CLOUDROUTER_MP_TAB_BAR = [
  {
    routeKey: 'dashboard',
    pagePath: 'pages/dashboard/index',
    titleKey: CLOUDROUTER_CONSOLE_ROUTES.dashboard.titleKey,
  },
  {
    routeKey: 'usage',
    pagePath: 'pages/usage/index',
    titleKey: CLOUDROUTER_CONSOLE_ROUTES.usage.titleKey,
  },
  {
    routeKey: 'apiKeys',
    pagePath: 'pages/api-keys/index',
    titleKey: CLOUDROUTER_CONSOLE_ROUTES.apiKeys.titleKey,
  },
  {
    routeKey: 'catalog',
    pagePath: 'pages/catalog/index',
    titleKey: CLOUDROUTER_CONSOLE_ROUTES.catalog.titleKey,
  },
] as const;
