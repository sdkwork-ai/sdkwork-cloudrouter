import {
  CLOUDROUTER_CONSOLE_ACCESS_PERMISSION,
} from './permissions.js';
import {
  CLOUDROUTER_CONSOLE_ROUTES,
  CLOUDROUTER_PC_ROUTE_ALIGNMENT,
  type CloudRouterConsoleRouteKey,
} from './routes.js';

export type CloudRouterConsoleCapabilityId =
  | 'console-dashboard'
  | 'console-usage'
  | 'console-api-keys'
  | 'console-catalog';

export interface CloudRouterCapabilityDescriptor {
  readonly id: CloudRouterConsoleCapabilityId;
  readonly routeKey: CloudRouterConsoleRouteKey;
  readonly routeId: string;
  readonly path: string;
  readonly titleKey: string;
  readonly summaryKey: string;
  readonly permissionScope: string;
  readonly pcAlignedPaths: readonly string[];
  readonly order: number;
}

/**
 * The Cloud Router console capability set shared by every client root.
 * `pcAlignedPaths` is the audit link back to the PC surface each capability
 * mirrors; capability parity is asserted by the family contract test.
 */
export const CLOUDROUTER_CONSOLE_CAPABILITIES: readonly CloudRouterCapabilityDescriptor[] = [
  {
    id: 'console-dashboard',
    routeKey: 'dashboard',
    routeId: CLOUDROUTER_CONSOLE_ROUTES.dashboard.id,
    path: CLOUDROUTER_CONSOLE_ROUTES.dashboard.path,
    titleKey: 'cloudrouter.console.dashboard.title',
    summaryKey: 'cloudrouter.console.dashboard.summary',
    permissionScope: CLOUDROUTER_CONSOLE_ACCESS_PERMISSION,
    pcAlignedPaths: CLOUDROUTER_PC_ROUTE_ALIGNMENT.dashboard,
    order: 10,
  },
  {
    id: 'console-usage',
    routeKey: 'usage',
    routeId: CLOUDROUTER_CONSOLE_ROUTES.usage.id,
    path: CLOUDROUTER_CONSOLE_ROUTES.usage.path,
    titleKey: 'cloudrouter.console.usage.title',
    summaryKey: 'cloudrouter.console.usage.summary',
    permissionScope: CLOUDROUTER_CONSOLE_ACCESS_PERMISSION,
    pcAlignedPaths: CLOUDROUTER_PC_ROUTE_ALIGNMENT.usage,
    order: 20,
  },
  {
    id: 'console-api-keys',
    routeKey: 'apiKeys',
    routeId: CLOUDROUTER_CONSOLE_ROUTES.apiKeys.id,
    path: CLOUDROUTER_CONSOLE_ROUTES.apiKeys.path,
    titleKey: 'cloudrouter.console.apiKeys.title',
    summaryKey: 'cloudrouter.console.apiKeys.summary',
    permissionScope: CLOUDROUTER_CONSOLE_ACCESS_PERMISSION,
    pcAlignedPaths: CLOUDROUTER_PC_ROUTE_ALIGNMENT.apiKeys,
    order: 30,
  },
  {
    id: 'console-catalog',
    routeKey: 'catalog',
    routeId: CLOUDROUTER_CONSOLE_ROUTES.catalog.id,
    path: CLOUDROUTER_CONSOLE_ROUTES.catalog.path,
    titleKey: 'cloudrouter.console.catalog.title',
    summaryKey: 'cloudrouter.console.catalog.summary',
    permissionScope: CLOUDROUTER_CONSOLE_ACCESS_PERMISSION,
    pcAlignedPaths: CLOUDROUTER_PC_ROUTE_ALIGNMENT.catalog,
    order: 40,
  },
];

export const CLOUDROUTER_CONSOLE_CAPABILITY_IDS: readonly CloudRouterConsoleCapabilityId[] =
  CLOUDROUTER_CONSOLE_CAPABILITIES.map((capability) => capability.id);

export function findCloudRouterConsoleCapability(
  id: string,
): CloudRouterCapabilityDescriptor | undefined {
  return CLOUDROUTER_CONSOLE_CAPABILITIES.find((capability) => capability.id === id);
}
