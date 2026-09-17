import { type CloudRouterHarmonyRouteRegistration } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-shell';

/**
 * Route contributions for the console-catalog capability.
 *
 * Route ids are the canonical Cloud Router console route ids and stay aligned
 * with the PC, H5, mini program, and Flutter roots. Route metadata must not
 * declare HTTP API paths, SDK methods, or transport details.
 */
export const consoleCatalogRouteContributions: CloudRouterHarmonyRouteRegistration[] = [
  {
    id: 'console.router.catalog.pricing',
    surface: 'console',
    capability: 'console-catalog',
    screen: 'ConsoleCatalogScreen',
    pagePath: 'pages/console/ConsoleCatalog',
    titleKey: 'cloudrouter.console.catalog.title',
    auth: 'required',
    permissionHint: 'cloudrouter.console.access',
    order: 40,
  },
];
