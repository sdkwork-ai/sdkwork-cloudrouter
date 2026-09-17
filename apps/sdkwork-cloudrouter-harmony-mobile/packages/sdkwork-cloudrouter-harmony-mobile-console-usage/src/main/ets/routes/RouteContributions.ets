import { type CloudRouterHarmonyRouteRegistration } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-shell';

/**
 * Route contributions for the console-usage capability.
 *
 * Route ids are the canonical Cloud Router console route ids and stay aligned
 * with the PC, H5, mini program, and Flutter roots. Route metadata must not
 * declare HTTP API paths, SDK methods, or transport details.
 */
export const consoleUsageRouteContributions: CloudRouterHarmonyRouteRegistration[] = [
  {
    id: 'console.router.usage.records',
    surface: 'console',
    capability: 'console-usage',
    screen: 'ConsoleUsageScreen',
    pagePath: 'pages/console/ConsoleUsage',
    titleKey: 'cloudrouter.console.usage.title',
    auth: 'required',
    permissionHint: 'cloudrouter.console.access',
    order: 20,
  },
];
