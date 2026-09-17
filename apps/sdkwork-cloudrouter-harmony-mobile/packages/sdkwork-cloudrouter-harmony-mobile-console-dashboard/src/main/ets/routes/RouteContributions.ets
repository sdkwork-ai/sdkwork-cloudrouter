import { type CloudRouterHarmonyRouteRegistration } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-shell';

/**
 * Route contributions for the console-dashboard capability.
 *
 * Route ids are the canonical Cloud Router console route ids and stay aligned
 * with the PC, H5, mini program, and Flutter roots. Route metadata must not
 * declare HTTP API paths, SDK methods, or transport details.
 */
export const consoleDashboardRouteContributions: CloudRouterHarmonyRouteRegistration[] = [
  {
    id: 'console.router.dashboard.overview',
    surface: 'console',
    capability: 'console-dashboard',
    screen: 'ConsoleDashboardScreen',
    pagePath: 'pages/console/ConsoleDashboard',
    titleKey: 'cloudrouter.console.dashboard.title',
    auth: 'required',
    permissionHint: 'cloudrouter.console.access',
    order: 10,
  },
];
