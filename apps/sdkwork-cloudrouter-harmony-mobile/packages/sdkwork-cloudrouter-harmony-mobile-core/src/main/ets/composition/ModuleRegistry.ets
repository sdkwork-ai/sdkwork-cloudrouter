/**
 * Console module registry.
 *
 * Authority: `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`. Module ids and route
 * ids mirror the canonical Cloud Router console capability set published by
 * `@sdkwork/cloudrouter-contracts`; the root bootstrap assembles the actual
 * page contributions from the capability packages.
 *
 * This registry intentionally declares metadata only. Core must not import a
 * capability package: dependency direction runs feature -> core, never the
 * reverse.
 */
export interface CloudRouterHarmonyModuleRegistration {
  readonly id: string;
  readonly routeId: string;
  readonly pagePath: string;
  readonly order: number;
}

export function listCloudRouterHarmonyModules(): CloudRouterHarmonyModuleRegistration[] {
  return [
    { id: 'console-dashboard', routeId: 'console.router.dashboard.overview', pagePath: 'pages/console/ConsoleDashboard', order: 10 },
    { id: 'console-usage', routeId: 'console.router.usage.records', pagePath: 'pages/console/ConsoleUsage', order: 20 },
    { id: 'console-api-keys', routeId: 'console.router.apiKeys.list', pagePath: 'pages/console/ConsoleApiKeys', order: 30 },
    { id: 'console-catalog', routeId: 'console.router.catalog.pricing', pagePath: 'pages/console/ConsoleCatalog', order: 40 },
  ];
}

export function listCloudRouterHarmonyModuleCount(): number {
  return listCloudRouterHarmonyModules().length;
}
