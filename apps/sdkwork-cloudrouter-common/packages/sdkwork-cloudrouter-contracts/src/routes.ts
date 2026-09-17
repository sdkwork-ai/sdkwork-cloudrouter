/**
 * Canonical Cloud Router client route identity.
 *
 * Route ids follow `<surface>.<domain>.<capability>.<screen>` from
 * `MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md` section 9 and are reused unchanged by
 * every Cloud Router client root so navigation, telemetry, and route metadata
 * stay comparable across platforms.
 */
export interface CloudRouterRouteDescriptor {
  readonly id: string;
  readonly path: string;
  readonly screen: string;
  readonly titleKey: string;
  readonly requiresAuthentication: boolean;
}

export const CLOUDROUTER_CONSOLE_ROUTES = {
  signIn: {
    id: 'auth.router.session.signIn',
    path: '/sign-in',
    screen: 'ConsoleSignInScreen',
    titleKey: 'cloudrouter.auth.signIn.title',
    requiresAuthentication: false,
  },
  dashboard: {
    id: 'console.router.dashboard.overview',
    path: '/dashboard',
    screen: 'ConsoleDashboardScreen',
    titleKey: 'cloudrouter.console.dashboard.title',
    requiresAuthentication: true,
  },
  usage: {
    id: 'console.router.usage.records',
    path: '/usage',
    screen: 'ConsoleUsageScreen',
    titleKey: 'cloudrouter.console.usage.title',
    requiresAuthentication: true,
  },
  apiKeys: {
    id: 'console.router.apiKeys.list',
    path: '/api-keys',
    screen: 'ConsoleApiKeysScreen',
    titleKey: 'cloudrouter.console.apiKeys.title',
    requiresAuthentication: true,
  },
  catalog: {
    id: 'console.router.catalog.pricing',
    path: '/catalog',
    screen: 'ConsoleCatalogScreen',
    titleKey: 'cloudrouter.console.catalog.title',
    requiresAuthentication: true,
  },
} as const satisfies Record<string, CloudRouterRouteDescriptor>;

export type CloudRouterConsoleRouteKey = keyof typeof CLOUDROUTER_CONSOLE_ROUTES;

/** Authenticated console navigation order; the sign-in route is never a tab. */
export const CLOUDROUTER_CONSOLE_ROUTE_ORDER = [
  'dashboard',
  'usage',
  'apiKeys',
  'catalog',
] as const satisfies readonly CloudRouterConsoleRouteKey[];

/** PC portal/console paths each mobile capability stays aligned with. */
export const CLOUDROUTER_PC_ROUTE_ALIGNMENT = {
  signIn: ['/auth'],
  dashboard: ['/console/dashboard', '/console/gateway'],
  usage: ['/console/usage'],
  apiKeys: ['/console/api-keys'],
  catalog: ['/models', '/pricing', '/rankings'],
} as const satisfies Record<CloudRouterConsoleRouteKey, readonly string[]>;
