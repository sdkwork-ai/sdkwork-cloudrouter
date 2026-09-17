import { CLOUDROUTER_CONSOLE_ROUTES } from '@sdkwork/cloudrouter-contracts';

export const CONSOLE_CATALOG_ROUTE = CLOUDROUTER_CONSOLE_ROUTES.catalog;

export const CONSOLE_CATALOG_ROUTE_CONTRIBUTION = {
  capabilityId: 'console-catalog',
  routeId: CONSOLE_CATALOG_ROUTE.id,
  path: CONSOLE_CATALOG_ROUTE.path,
  pagePath: 'pages/catalog/index',
  screen: CONSOLE_CATALOG_ROUTE.screen,
} as const;
