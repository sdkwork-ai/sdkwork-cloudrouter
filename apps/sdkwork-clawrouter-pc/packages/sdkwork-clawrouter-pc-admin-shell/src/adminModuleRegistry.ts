import {
  Activity,
  ArrowRightLeft,
  BadgePercent,
  BarChart3,
  Boxes,
  CloudCog,
  CreditCard,
  Crown,
  Database,
  DatabaseZap,
  FolderCog,
  Gauge,
  Gift,
  Globe2,
  HardDrive,
  Home,
  LayoutDashboard,
  Network,
  Package,
  ReceiptText,
  Recycle,
  RefreshCcw,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Tags,
  TicketPercent,
  Users,
  WalletCards,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type AdminModuleId =
  | 'home'
  | 'membershipCenter'
  | 'marketingCenter'
  | 'paymentCenter'
  | 'storageCenter'
  | 'operations';

export interface AdminModuleDef {
  id: AdminModuleId;
  nameKey: string;
  icon: LucideIcon;
  defaultPath: string;
  pathPrefixes: string[];
}

export type AdminMenuItem = {
  path: string;
  labelKey: string;
  icon: LucideIcon;
  iconColor?: string;
};

export type AdminMenuGroup = {
  groupKey: string;
  items: AdminMenuItem[];
};

export type AdminModuleMenu = {
  moduleId: AdminModuleId;
  items?: AdminMenuItem[];
  groups: AdminMenuGroup[];
};

function moduleBlock(definition: AdminModuleDef): AdminModuleDef {
  return definition;
}

function groupBlock(groupKey: string, items: AdminMenuItem[]): AdminMenuGroup {
  return { groupKey, items };
}

function itemBlock(item: AdminMenuItem): AdminMenuItem {
  return item;
}

export const ADMIN_MODULES: AdminModuleDef[] = [
  moduleBlock({
    id: 'home',
    nameKey: 'admin.header.home',
    icon: Home,
    defaultPath: '/admin/dashboard',
    pathPrefixes: [
      '/admin/dashboard',
      '/admin/upstream',
      '/admin/model',
      '/admin/record',
      '/admin/analytics',
    ],
  }),
  moduleBlock({
    id: 'membershipCenter',
    nameKey: 'admin.header.membershipCenter',
    icon: Crown,
    defaultPath: '/admin/memberships/plans',
    pathPrefixes: ['/admin/memberships', '/admin/recharges'],
  }),
  moduleBlock({
    id: 'marketingCenter',
    nameKey: 'admin.header.marketingCenter',
    icon: BadgePercent,
    defaultPath: '/admin/marketing/promotionOffers',
    pathPrefixes: ['/admin/marketing', '/admin/promotions'],
  }),
  moduleBlock({
    id: 'paymentCenter',
    nameKey: 'admin.header.paymentCenter',
    icon: CreditCard,
    defaultPath: '/admin/payments/providerAccounts',
    pathPrefixes: ['/admin/payments'],
  }),
  moduleBlock({
    id: 'storageCenter',
    nameKey: 'admin.header.storageCenter',
    icon: CloudCog,
    defaultPath: '/admin/storage/providers',
    pathPrefixes: ['/admin/storage'],
  }),
  moduleBlock({
    id: 'operations',
    nameKey: 'admin.header.operations',
    icon: Wrench,
    defaultPath: '/admin/monitor',
    pathPrefixes: [
      '/admin/ratelimit',
      '/admin/monitor',
      '/admin/cache',
      '/admin/service-nodes',
      '/admin/settings',
      '/admin/runtime-region',
      '/admin/site',
    ],
  }),
];

export const ADMIN_MODULE_MENUS: AdminModuleMenu[] = [
  {
    moduleId: 'home',
    items: [
      itemBlock({ path: '/admin/dashboard', labelKey: 'admin.menu.dashboard', icon: LayoutDashboard }),
    ],
    groups: [
      groupBlock('admin.menu.home.modelManagement', [
        itemBlock({ path: '/admin/model', labelKey: 'admin.menu.models', icon: Database }),
        itemBlock({ path: '/admin/model/resources', labelKey: 'admin.menu.modelResources', icon: Boxes, iconColor: 'text-emerald-500' }),
        itemBlock({ path: '/admin/model/mappings', labelKey: 'admin.menu.modelMappings', icon: ArrowRightLeft, iconColor: 'text-indigo-500' }),
      ]),
      groupBlock('admin.menu.home.upstreamManagement', [
        itemBlock({ path: '/admin/upstream', labelKey: 'admin.menu.upstream', icon: Network, iconColor: 'text-cyan-500' }),
      ]),
      groupBlock('admin.menu.home.dataManagement', [
        itemBlock({ path: '/admin/record', labelKey: 'admin.menu.records', icon: Activity }),
        itemBlock({ path: '/admin/analytics', labelKey: 'admin.menu.analytics', icon: BarChart3 }),
      ]),
    ],
  },
  {
    moduleId: 'membershipCenter',
    groups: [
      groupBlock('admin.menu.memberships.catalog', [
        itemBlock({ path: '/admin/memberships/plans', labelKey: 'admin.menu.memberships.plans', icon: Crown }),
        itemBlock({ path: '/admin/memberships/packageGroups', labelKey: 'admin.menu.memberships.packageGroups', icon: Boxes }),
        itemBlock({ path: '/admin/memberships/packages', labelKey: 'admin.menu.memberships.packages', icon: Package }),
        itemBlock({ path: '/admin/memberships/vipPackages', labelKey: 'admin.menu.memberships.vipPackages', icon: Gift }),
      ]),
      groupBlock('admin.menu.memberships.users', [
        itemBlock({ path: '/admin/memberships/members', labelKey: 'admin.menu.memberships.members', icon: Users }),
        itemBlock({ path: '/admin/memberships/entitlements', labelKey: 'admin.menu.memberships.entitlements', icon: ShieldCheck }),
      ]),
      groupBlock('admin.menu.memberships.recharge', [
        itemBlock({ path: '/admin/memberships/rechargePackages', labelKey: 'admin.menu.memberships.rechargePackages', icon: WalletCards }),
      ]),
    ],
  },
  {
    moduleId: 'marketingCenter',
    groups: [
      groupBlock('admin.menu.marketing.design', [
        itemBlock({ path: '/admin/marketing/promotionOffers', labelKey: 'admin.menu.marketing.offers', icon: BadgePercent }),
        itemBlock({ path: '/admin/marketing/promotionCouponStocks', labelKey: 'admin.menu.marketing.couponStocks', icon: Boxes }),
        itemBlock({ path: '/admin/marketing/promotionCodes', labelKey: 'admin.menu.marketing.codes', icon: TicketPercent }),
        itemBlock({ path: '/admin/marketing/promotionCodeRedemptions', labelKey: 'admin.menu.marketing.redemptions', icon: Gift }),
      ]),
      groupBlock('admin.menu.marketing.lifecycle', [
        itemBlock({ path: '/admin/marketing/userCoupons', labelKey: 'admin.menu.marketing.userCoupons', icon: WalletCards }),
        itemBlock({ path: '/admin/marketing/discountApplications', labelKey: 'admin.menu.marketing.discountApplications', icon: ReceiptText }),
        itemBlock({ path: '/admin/marketing/discountAllocations', labelKey: 'admin.menu.marketing.discountAllocations', icon: Tags }),
      ]),
      groupBlock('admin.menu.marketing.growth', [
        itemBlock({ path: '/admin/marketing/promotionCouponLedger', labelKey: 'admin.menu.marketing.couponLedger', icon: Database }),
        itemBlock({ path: '/admin/marketing/budgetLedger', labelKey: 'admin.menu.marketing.budgetLedger', icon: BarChart3 }),
        itemBlock({ path: '/admin/marketing/externalBindings', labelKey: 'admin.menu.marketing.externalBindings', icon: ArrowRightLeft }),
        itemBlock({ path: '/admin/marketing/promotionEvents', labelKey: 'admin.menu.marketing.events', icon: Activity }),
        itemBlock({ path: '/admin/marketing/referrals', labelKey: 'admin.menu.marketing.referrals', icon: Users }),
      ]),
    ],
  },
  {
    moduleId: 'paymentCenter',
    groups: [
      groupBlock('admin.menu.payments.configuration', [
        itemBlock({ path: '/admin/payments/providers', labelKey: 'admin.menu.payments.providers', icon: CloudCog }),
        itemBlock({ path: '/admin/payments/providerAccounts', labelKey: 'admin.menu.payments.providerAccounts', icon: CreditCard }),
        itemBlock({ path: '/admin/payments/methods', labelKey: 'admin.menu.payments.methods', icon: WalletCards }),
        itemBlock({ path: '/admin/payments/channels', labelKey: 'admin.menu.payments.channels', icon: Network }),
        itemBlock({ path: '/admin/payments/routeRules', labelKey: 'admin.menu.payments.routeRules', icon: ArrowRightLeft }),
      ]),
      groupBlock('admin.menu.payments.monitoring', [
        itemBlock({ path: '/admin/payments/intents', labelKey: 'admin.menu.payments.intents', icon: ReceiptText }),
        itemBlock({ path: '/admin/payments/attempts', labelKey: 'admin.menu.payments.attempts', icon: Activity }),
        itemBlock({ path: '/admin/payments/webhookEvents', labelKey: 'admin.menu.payments.webhookEvents', icon: RefreshCcw }),
        itemBlock({ path: '/admin/payments/reconciliationRuns', labelKey: 'admin.menu.payments.reconciliation', icon: DatabaseZap }),
      ]),
    ],
  },
  {
    moduleId: 'storageCenter',
    groups: [
      groupBlock('admin.menu.storage.configuration', [
        itemBlock({ path: '/admin/storage/providers', labelKey: 'admin.menu.storage.providers', icon: CloudCog }),
        itemBlock({ path: '/admin/storage/buckets', labelKey: 'admin.menu.storage.buckets', icon: FolderCog }),
        itemBlock({ path: '/admin/storage/defaultBuckets', labelKey: 'admin.menu.storage.defaultBuckets', icon: HardDrive }),
      ]),
      groupBlock('admin.menu.storage.governance', [
        itemBlock({ path: '/admin/storage/quotas', labelKey: 'admin.menu.storage.quotas', icon: Gauge }),
        itemBlock({ path: '/admin/storage/usage', labelKey: 'admin.menu.storage.usage', icon: BarChart3 }),
        itemBlock({ path: '/admin/storage/reconciliation', labelKey: 'admin.menu.storage.reconciliation', icon: RefreshCcw }),
        itemBlock({ path: '/admin/storage/garbageCollection', labelKey: 'admin.menu.storage.garbageCollection', icon: Recycle }),
      ]),
    ],
  },
  {
    moduleId: 'operations',
    groups: [
      groupBlock('admin.menu.ops.monitoring', [
        itemBlock({ path: '/admin/monitor', labelKey: 'admin.menu.monitor', icon: Activity }),
      ]),
      groupBlock('admin.menu.ops.security', [
        itemBlock({ path: '/admin/ratelimit', labelKey: 'admin.menu.rateLimit', icon: ShieldAlert, iconColor: 'text-red-500' }),
      ]),
      groupBlock('admin.menu.ops.infrastructure', [
        itemBlock({ path: '/admin/service-nodes', labelKey: 'admin.menu.serviceNodes', icon: Server, iconColor: 'text-cyan-500' }),
        itemBlock({ path: '/admin/cache', labelKey: 'admin.menu.cache', icon: HardDrive, iconColor: 'text-emerald-500' }),
      ]),
      groupBlock('admin.menu.ops.system', [
        itemBlock({ path: '/admin/settings', labelKey: 'admin.menu.authSettings', icon: ShieldCheck, iconColor: 'text-blue-500' }),
        itemBlock({ path: '/admin/runtime-region', labelKey: 'admin.menu.runtimeRegion', icon: Globe2, iconColor: 'text-cyan-500' }),
        itemBlock({ path: '/admin/site', labelKey: 'admin.menu.siteSettings', icon: Settings, iconColor: 'text-indigo-500' }),
      ]),
    ],
  },
];

export function getActiveModuleFromPath(pathname: string): AdminModuleId {
  for (const mod of ADMIN_MODULES) {
    if (mod.pathPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return mod.id;
    }
  }
  return 'home';
}

export function getAdminModuleMenu(moduleId: AdminModuleId): AdminModuleMenu {
  return ADMIN_MODULE_MENUS.find((menu) => menu.moduleId === moduleId) ?? ADMIN_MODULE_MENUS[0]!;
}
