import { type CloudRouterHarmonyRouteRegistration } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-shell';

/**
 * Route contributions for the console-api-keys capability.
 *
 * Route ids are the canonical Cloud Router console route ids and stay aligned
 * with the PC, H5, mini program, and Flutter roots. Route metadata must not
 * declare HTTP API paths, SDK methods, or transport details.
 */
export const consoleApiKeysRouteContributions: CloudRouterHarmonyRouteRegistration[] = [
  {
    id: 'console.router.apiKeys.list',
    surface: 'console',
    capability: 'console-api-keys',
    screen: 'ConsoleApiKeysScreen',
    pagePath: 'pages/console/ConsoleApiKeys',
    titleKey: 'cloudrouter.console.apiKeys.title',
    auth: 'required',
    permissionHint: 'cloudrouter.console.access',
    order: 30,
  },
];
