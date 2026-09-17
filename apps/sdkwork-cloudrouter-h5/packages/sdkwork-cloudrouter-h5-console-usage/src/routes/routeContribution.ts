import { CLOUDROUTER_CONSOLE_ROUTES } from '@sdkwork/cloudrouter-contracts';

export const CONSOLE_USAGE_ROUTE = CLOUDROUTER_CONSOLE_ROUTES.usage;

export const CONSOLE_USAGE_ROUTE_CONTRIBUTION = {
  capabilityId: 'console-usage',
  routeId: CONSOLE_USAGE_ROUTE.id,
  path: CONSOLE_USAGE_ROUTE.path,
  screen: CONSOLE_USAGE_ROUTE.screen,
} as const;
