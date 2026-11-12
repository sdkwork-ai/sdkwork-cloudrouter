import {
  Activity,
  Boxes,
  Cable,
  CircuitBoard,
  Cpu,
  Gauge,
  LayoutDashboard,
  Network,
  Rocket,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';

/**
 * Smart Hardware Center (智能硬件中心) admin contribution.
 *
 * Route records, menu records, permission hints, and the module definition for
 * the AIoT management domain live in this package so the embedding host only
 * composes them: `sdkwork-cloudrouter` spreads the module into the header
 * registry, the menu table, and the route table, exactly like the IAM, RTC,
 * TRADE, and messaging contributions.
 */

export const HARDWARE_ADMIN_DEFAULT_PATH = '/admin/hardware';

export const HARDWARE_ADMIN_ROUTE_PREFIX = '/admin/hardware';

export interface SdkworkHardwareAdminModuleDef {
  id: 'hardwareCenter';
  nameKey: string;
  icon: LucideIcon;
  defaultPath: string;
  pathPrefixes: string[];
}

export const HARDWARE_ADMIN_MODULE_DEF: SdkworkHardwareAdminModuleDef = {
  id: 'hardwareCenter',
  nameKey: 'admin.header.hardwareCenter',
  icon: CircuitBoard,
  defaultPath: HARDWARE_ADMIN_DEFAULT_PATH,
  pathPrefixes: [HARDWARE_ADMIN_ROUTE_PREFIX],
};

export interface SdkworkHardwareAdminMenuItem {
  path: string;
  labelKey: string;
  icon: LucideIcon;
  iconColor?: string;
}

export interface SdkworkHardwareAdminMenuGroup {
  groupKey: string;
  items: SdkworkHardwareAdminMenuItem[];
}

export interface SdkworkHardwareAdminMenu {
  moduleId: 'hardwareCenter';
  items?: SdkworkHardwareAdminMenuItem[];
  groups: SdkworkHardwareAdminMenuGroup[];
}

export const HARDWARE_ADMIN_MENU: SdkworkHardwareAdminMenu = {
  moduleId: 'hardwareCenter',
  items: [
    {
      path: '/admin/hardware',
      labelKey: 'admin.menu.hardware.overview',
      icon: LayoutDashboard,
    },
  ],
  groups: [
    {
      groupKey: 'admin.menu.hardware.thingModel',
      items: [
        {
          path: '/admin/hardware/products',
          labelKey: 'admin.menu.hardware.products',
          icon: Boxes,
          iconColor: 'text-lobster-400',
        },
        {
          path: '/admin/hardware/hardware-profiles',
          labelKey: 'admin.menu.hardware.hardwareProfiles',
          icon: CircuitBoard,
          iconColor: 'text-lobster-400',
        },
        {
          path: '/admin/hardware/protocol-profiles',
          labelKey: 'admin.menu.hardware.protocolProfiles',
          icon: Network,
          iconColor: 'text-lobster-400',
        },
        {
          path: '/admin/hardware/capability-models',
          labelKey: 'admin.menu.hardware.capabilityModels',
          icon: SlidersHorizontal,
        },
      ],
    },
    {
      groupKey: 'admin.menu.hardware.fleet',
      items: [
        {
          path: '/admin/hardware/devices',
          labelKey: 'admin.menu.hardware.devices',
          icon: Cpu,
        },
        {
          path: '/admin/hardware/device-settings',
          labelKey: 'admin.menu.hardware.deviceSettings',
          icon: SlidersHorizontal,
          iconColor: 'text-cyan-500',
        },
      ],
    },
    {
      groupKey: 'admin.menu.hardware.firmware',
      items: [
        {
          path: '/admin/hardware/firmware-artifacts',
          labelKey: 'admin.menu.hardware.firmwareArtifacts',
          icon: Boxes,
        },
        {
          path: '/admin/hardware/firmware-rollouts',
          labelKey: 'admin.menu.hardware.firmwareRollouts',
          icon: Rocket,
          iconColor: 'text-amber-500',
        },
      ],
    },
    {
      groupKey: 'admin.menu.hardware.governance',
      items: [
        {
          path: '/admin/hardware/events',
          labelKey: 'admin.menu.hardware.events',
          icon: Activity,
        },
        {
          path: '/admin/hardware/protocol-adapters',
          labelKey: 'admin.menu.hardware.protocolAdapters',
          icon: Cable,
        },
        {
          path: '/admin/hardware/runtime',
          labelKey: 'admin.menu.hardware.runtime',
          icon: Gauge,
        },
      ],
    },
  ],
};

export type SdkworkHardwareAdminScreen =
  | 'overview'
  | 'products'
  | 'hardware-profiles'
  | 'protocol-profiles'
  | 'capability-models'
  | 'devices'
  | 'device-detail'
  | 'device-settings'
  | 'firmware-artifacts'
  | 'firmware-rollouts'
  | 'events'
  | 'protocol-adapters'
  | 'runtime';

export interface SdkworkHardwareAdminRouteRecord {
  path: string;
  requiredPermission: string;
  redirectTo?: string;
  screen: SdkworkHardwareAdminScreen;
}

export const HARDWARE_ADMIN_ROUTE_RECORDS: readonly SdkworkHardwareAdminRouteRecord[] = [
  {
    path: 'hardware',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'overview',
  },
  {
    path: 'hardware/products',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'products',
  },
  {
    path: 'hardware/hardware-profiles',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'hardware-profiles',
  },
  {
    path: 'hardware/protocol-profiles',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'protocol-profiles',
  },
  {
    path: 'hardware/capability-models',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'capability-models',
  },
  {
    path: 'hardware/devices',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'devices',
  },
  {
    path: 'hardware/devices/:deviceId',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'device-detail',
  },
  {
    path: 'hardware/device-settings',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'device-settings',
  },
  {
    path: 'hardware/firmware-artifacts',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'firmware-artifacts',
  },
  {
    path: 'hardware/firmware-rollouts',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'firmware-rollouts',
  },
  {
    path: 'hardware/events',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'events',
  },
  {
    path: 'hardware/protocol-adapters',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'protocol-adapters',
  },
  {
    path: 'hardware/runtime',
    requiredPermission: 'cloudrouter.admin.access',
    screen: 'runtime',
  },
];

export interface SdkworkHardwareAdminPermissionHint {
  pathPrefix: string;
  requiredPermission: string;
}

export const HARDWARE_ADMIN_PERMISSION_HINTS: readonly SdkworkHardwareAdminPermissionHint[] = [
  { pathPrefix: '/admin/hardware', requiredPermission: 'cloudrouter.admin.access' },
];
