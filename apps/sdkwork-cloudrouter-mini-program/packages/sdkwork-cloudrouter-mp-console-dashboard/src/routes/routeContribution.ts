import { CLOUDROUTER_CONSOLE_ROUTES } from '@sdkwork/cloudrouter-contracts';

export const CONSOLE_DASHBOARD_ROUTE = CLOUDROUTER_CONSOLE_ROUTES.dashboard;

export const CONSOLE_DASHBOARD_ROUTE_CONTRIBUTION = {
  capabilityId: 'console-dashboard',
  routeId: CONSOLE_DASHBOARD_ROUTE.id,
  path: CONSOLE_DASHBOARD_ROUTE.path,
  pagePath: 'pages/dashboard/index',
  screen: CONSOLE_DASHBOARD_ROUTE.screen,
} as const;
