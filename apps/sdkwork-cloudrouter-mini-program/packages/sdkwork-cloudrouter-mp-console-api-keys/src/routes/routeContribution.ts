import { CLOUDROUTER_CONSOLE_ROUTES } from '@sdkwork/cloudrouter-contracts';

export const CONSOLE_APIKEYS_ROUTE = CLOUDROUTER_CONSOLE_ROUTES.apiKeys;

export const CONSOLE_APIKEYS_ROUTE_CONTRIBUTION = {
  capabilityId: 'console-api-keys',
  routeId: CONSOLE_APIKEYS_ROUTE.id,
  path: CONSOLE_APIKEYS_ROUTE.path,
  pagePath: 'pages/api-keys/index',
  screen: CONSOLE_APIKEYS_ROUTE.screen,
} as const;
