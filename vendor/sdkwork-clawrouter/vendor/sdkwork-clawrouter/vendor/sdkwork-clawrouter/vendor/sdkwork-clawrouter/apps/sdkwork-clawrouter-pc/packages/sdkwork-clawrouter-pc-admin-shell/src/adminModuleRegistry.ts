import {
  Activity,
  ArrowRightLeft,
  BadgePercent,
  BarChart3,
  Bot,
  Boxes,
  Building2,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Database,
  FileText,
  FolderOpen,
  Globe2,
  GraduationCap,
  HardDrive,
  Handshake,
  Home,
  KeyRound,
  Layers,
  LayoutDashboard,
  Link2,
  Megaphone,
  MessageCircle,
  Network,
  Package,
  PackageCheck,
  PlaySquare,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  TrendingUp,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type AdminModuleId =
  | 'home'
  | 'productCenter'
  | 'transactionCenter'
  | 'marketingCenter'
  | 'financeCenter'
  | 'storageCenter'
  | 'driveCenter'
  | 'operations'
  | 'serviceProviderCenter'
  | 'messagingCenter';

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
    pathPrefixes: ['/admin/dashboard', '/admin/user', '/admin/organization', '/admin/group', '/admin/model', '/admin/agents', '/admin/skill', '/admin/prompts', '/admin/mcp', '/admin/channel', '/admin/record', '/admin/analytics', '/admin/announcement'],
  }),
  moduleBlock({
    id: 'productCenter',
    nameKey: 'admin.header.productCenter',
    icon: ShoppingBag,
    defaultPath: '/admin/catalog/products',
    pathPrefixes: ['/admin/catalog', '/admin/inventory'],
  }),
  moduleBlock({
    id: 'transactionCenter',
    nameKey: 'admin.header.transactionCenter',
    icon: ShoppingCart,
    defaultPath: '/admin/orders/orders',
    pathPrefixes: ['/admin/orders', '/admin/payments'],
  }),
  moduleBlock({
    id: 'marketingCenter',
    nameKey: 'admin.header.marketingCenter',
    icon: Megaphone,
    defaultPath: '/admin/marketing/offers',
    pathPrefixes: ['/admin/marketing'],
  }),
  moduleBlock({
    id: 'financeCenter',
    nameKey: 'admin.header.financeCenter',
    icon: CircleDollarSign,
    defaultPath: '/admin/finance/order-revenue',
    pathPrefixes: ['/admin/finance', '/admin/wallet'],
  }),
  moduleBlock({
    id: 'storageCenter',
    nameKey: 'admin.header.storageCenter',
    icon: HardDrive,
    defaultPath: '/admin/storage/providers',
    pathPrefixes: ['/admin/storage'],
  }),
  moduleBlock({
    id: 'driveCenter',
    nameKey: 'admin.header.driveCenter',
    icon: FolderOpen,
    defaultPath: '/admin/drive/spaces',
    pathPrefixes: ['/admin/drive'],
  }),
  moduleBlock({
    id: 'operations',
    nameKey: 'admin.header.operations',
    icon: Wrench,
    defaultPath: '/admin/monitor',
    pathPrefixes: ['/admin/ratelimit', '/admin/monitor', '/admin/cache', '/admin/service-nodes', '/admin/settings', '/admin/runtime-region', '/admin/site', '/admin/oauth'],
  }),
  moduleBlock({
    id: 'messagingCenter',
    nameKey: 'admin.header.messagingCenter',
    icon: MessageCircle,
    defaultPath: '/admin/messaging/providers',
    pathPrefixes: ['/admin/messaging'],
  }),
  moduleBlock({
    id: 'serviceProviderCenter',
    nameKey: 'admin.header.serviceProviderCenter',
    icon: Handshake,
    defaultPath: '/admin/service-providers/dashboard',
    pathPrefixes: ['/admin/service-providers'],
  }),
];

export const ADMIN_MODULE_MENUS: AdminModuleMenu[] = [
  {
    moduleId: 'home',
    items: [
      itemBlock({ path: '/admin/dashboard', labelKey: 'admin.menu.dashboard', icon: LayoutDashboard }),
    ],
    groups: [
      groupBlock('admin.menu.home.userManagement', [
        itemBlock({ path: '/admin/user', labelKey: 'admin.menu.users', icon: Users }),
        itemBlock({ path: '/admin/organization', labelKey: 'admin.menu.organization', icon: Building2, iconColor: 'text-blue-500' }),
      ]),
      groupBlock('admin.menu.home.modelManagement', [
        itemBlock({ path: '/admin/model', labelKey: 'admin.menu.models', icon: Database }),
        itemBlock({ path: '/admin/model/resources', labelKey: 'admin.menu.modelResources', icon: Boxes, iconColor: 'text-emerald-500' }),
        itemBlock({ path: '/admin/model/sites', labelKey: 'admin.menu.modelSites', icon: Globe2, iconColor: 'text-sky-500' }),
        itemBlock({ path: '/admin/model/mappings', labelKey: 'admin.menu.modelMappings', icon: ArrowRightLeft, iconColor: 'text-indigo-500' }),
      ]),
      groupBlock('admin.menu.home.accountPoolManagement', [
        itemBlock({ path: '/admin/group', labelKey: 'admin.menu.groups', icon: UserCog }),
        itemBlock({ path: '/admin/channel', labelKey: 'admin.menu.channels', icon: Network }),
      ]),
      groupBlock('admin.menu.home.agentSkills', [
        itemBlock({ path: '/admin/agents', labelKey: 'admin.menu.agents', icon: Bot }),
        itemBlock({ path: '/admin/skill', labelKey: 'admin.menu.agentSkills', icon: Store }),
        itemBlock({ path: '/admin/prompts', labelKey: 'admin.menu.prompts', icon: FileText, iconColor: 'text-violet-500' }),
        itemBlock({ path: '/admin/mcp', labelKey: 'admin.menu.mcp', icon: Server, iconColor: 'text-cyan-500' }),
      ]),
      groupBlock('admin.menu.home.dataManagement', [
        itemBlock({ path: '/admin/record', labelKey: 'admin.menu.records', icon: Activity }),
        itemBlock({ path: '/admin/analytics', labelKey: 'admin.menu.analytics', icon: BarChart3 }),
      ]),
      groupBlock('admin.menu.home.system', [
        itemBlock({ path: '/admin/announcement', labelKey: 'admin.menu.announcements', icon: Megaphone }),
      ]),
    ],
  },
  {
    moduleId: 'productCenter',
    groups: [
      groupBlock('admin.menu.productCenter.catalog', [
        itemBlock({ path: '/admin/catalog/products', labelKey: 'admin.menu.catalogProducts', icon: PackageCheck, iconColor: 'text-blue-500' }),
        itemBlock({ path: '/admin/catalog/categories', labelKey: 'admin.menu.catalogCategories', icon: Package, iconColor: 'text-sky-500' }),
        itemBlock({ path: '/admin/catalog/skus', labelKey: 'admin.menu.catalogSkus', icon: PackageCheck, iconColor: 'text-indigo-500' }),
        itemBlock({ path: '/admin/catalog/attributes', labelKey: 'admin.menu.catalogAttributes', icon: Settings, iconColor: 'text-violet-500' }),
        itemBlock({ path: '/admin/catalog/prices', labelKey: 'admin.menu.catalogPrices', icon: CreditCard, iconColor: 'text-amber-500' }),
      ]),
      groupBlock('admin.menu.productCenter.inventory', [
        itemBlock({ path: '/admin/inventory/stocks', labelKey: 'admin.menu.inventoryStocks', icon: Boxes, iconColor: 'text-emerald-500' }),
        itemBlock({ path: '/admin/inventory/reservations', labelKey: 'admin.menu.inventoryReservations', icon: ShieldCheck, iconColor: 'text-cyan-500' }),
        itemBlock({ path: '/admin/inventory/ledger', labelKey: 'admin.menu.inventoryLedger', icon: FileText, iconColor: 'text-slate-500' }),
      ]),
    ],
  },
  {
    moduleId: 'transactionCenter',
    groups: [
      groupBlock('admin.menu.transactionCenter.orders', [
        itemBlock({ path: '/admin/orders/orders', labelKey: 'admin.menu.orderList', icon: ClipboardList, iconColor: 'text-indigo-500' }),
        itemBlock({ path: '/admin/orders/refunds', labelKey: 'admin.menu.orderRefunds', icon: FileText, iconColor: 'text-red-500' }),
        itemBlock({ path: '/admin/orders/fulfillments', labelKey: 'admin.menu.orderFulfillments', icon: PackageCheck, iconColor: 'text-emerald-500' }),
        itemBlock({ path: '/admin/orders/shipments', labelKey: 'admin.menu.orderShipments', icon: Package, iconColor: 'text-sky-500' }),
      ]),
      groupBlock('admin.menu.transactionCenter.payments', [
        itemBlock({ path: '/admin/payments/provider-accounts', labelKey: 'admin.menu.paymentProviderAccounts', icon: CreditCard, iconColor: 'text-sky-500' }),
        itemBlock({ path: '/admin/payments/providers', labelKey: 'admin.menu.paymentProviders', icon: CreditCard, iconColor: 'text-blue-500' }),
        itemBlock({ path: '/admin/payments/methods', labelKey: 'admin.menu.paymentMethods', icon: CreditCard, iconColor: 'text-cyan-500' }),
        itemBlock({ path: '/admin/payments/channels', labelKey: 'admin.menu.paymentChannels', icon: Network, iconColor: 'text-indigo-500' }),
        itemBlock({ path: '/admin/payments/route-rules', labelKey: 'admin.menu.paymentRouteRules', icon: ShieldCheck, iconColor: 'text-amber-500' }),
        itemBlock({ path: '/admin/payments/intents', labelKey: 'admin.menu.paymentIntents', icon: ClipboardList, iconColor: 'text-violet-500' }),
        itemBlock({ path: '/admin/payments/attempts', labelKey: 'admin.menu.paymentAttempts', icon: Activity, iconColor: 'text-orange-500' }),
        itemBlock({ path: '/admin/payments/webhook-events', labelKey: 'admin.menu.paymentWebhookEvents', icon: Megaphone, iconColor: 'text-pink-500' }),
        itemBlock({ path: '/admin/payments/reconciliation-runs', labelKey: 'admin.menu.paymentReconciliationRuns', icon: BarChart3, iconColor: 'text-emerald-500' }),
      ]),
    ],
  },
  {
    moduleId: 'marketingCenter',
    groups: [
      groupBlock('admin.menu.marketingCenter.offers', [
        itemBlock({ path: '/admin/marketing/offers', labelKey: 'admin.menu.marketingPromotionOffers', icon: BadgePercent, iconColor: 'text-pink-500' }),
        itemBlock({ path: '/admin/marketing/promotion-coupon-stocks', labelKey: 'admin.menu.marketingPromotionCouponStocks', icon: Package, iconColor: 'text-orange-500' }),
        itemBlock({ path: '/admin/marketing/promotion-codes', labelKey: 'admin.menu.marketingPromotionCodes', icon: CreditCard, iconColor: 'text-lobster-500' }),
        itemBlock({ path: '/admin/marketing/promotion-code-redemptions', labelKey: 'admin.menu.marketingPromotionCodeRedemptions', icon: ClipboardList, iconColor: 'text-emerald-500' }),
      ]),
      groupBlock('admin.menu.marketingCenter.lifecycle', [
        itemBlock({ path: '/admin/marketing/user-coupons', labelKey: 'admin.menu.marketingUserCoupons', icon: CreditCard, iconColor: 'text-sky-500' }),
        itemBlock({ path: '/admin/marketing/discount-applications', labelKey: 'admin.menu.marketingDiscountApplications', icon: ClipboardList, iconColor: 'text-violet-500' }),
        itemBlock({ path: '/admin/marketing/discount-allocations', labelKey: 'admin.menu.marketingDiscountAllocations', icon: FileText, iconColor: 'text-blue-500' }),
      ]),
      groupBlock('admin.menu.marketingCenter.ledger', [
        itemBlock({ path: '/admin/marketing/promotion-coupon-ledger', labelKey: 'admin.menu.marketingPromotionCouponLedger', icon: FileText, iconColor: 'text-slate-500' }),
        itemBlock({ path: '/admin/marketing/budget-ledger', labelKey: 'admin.menu.marketingBudgetLedger', icon: CreditCard, iconColor: 'text-amber-500' }),
        itemBlock({ path: '/admin/marketing/external-bindings', labelKey: 'admin.menu.marketingExternalBindings', icon: Network, iconColor: 'text-cyan-500' }),
        itemBlock({ path: '/admin/marketing/events', labelKey: 'admin.menu.marketingEvents', icon: Activity, iconColor: 'text-red-500' }),
      ]),
      groupBlock('admin.menu.marketingCenter.growth', [
        itemBlock({ path: '/admin/marketing/referrals', labelKey: 'admin.menu.marketingReferrals', icon: TrendingUp, iconColor: 'text-pink-500' }),
      ]),
    ],
  },
  {
    moduleId: 'financeCenter',
    groups: [
      groupBlock('admin.menu.financeCenter.wallet', [
        itemBlock({ path: '/admin/wallet/wallet-accounts', labelKey: 'admin.menu.walletAccounts', icon: CreditCard, iconColor: 'text-emerald-500' }),
        itemBlock({ path: '/admin/wallet/wallet-ledger', labelKey: 'admin.menu.walletLedger', icon: FileText, iconColor: 'text-teal-500' }),
        itemBlock({ path: '/admin/wallet/recharge-orders', labelKey: 'admin.menu.walletRechargeOrders', icon: ClipboardList, iconColor: 'text-indigo-500' }),
        itemBlock({ path: '/admin/wallet/exchange-rules', labelKey: 'admin.menu.walletExchangeRules', icon: Settings, iconColor: 'text-amber-500' }),
      ]),
      groupBlock('admin.menu.financeCenter.invoices', [
        itemBlock({ path: '/admin/finance/invoice-titles', labelKey: 'admin.menu.financeInvoiceTitles', icon: FileText, iconColor: 'text-slate-500' }),
        itemBlock({ path: '/admin/finance/invoices', labelKey: 'admin.menu.financeInvoices', icon: FileText, iconColor: 'text-violet-500' }),
      ]),
      groupBlock('admin.menu.financeCenter.reports', [
        itemBlock({ path: '/admin/finance/order-revenue', labelKey: 'admin.menu.financeOrderRevenue', icon: BarChart3, iconColor: 'text-blue-500' }),
        itemBlock({ path: '/admin/finance/payment-reconciliation', labelKey: 'admin.menu.financePaymentReconciliation', icon: CreditCard, iconColor: 'text-cyan-500' }),
        itemBlock({ path: '/admin/finance/refunds-report', labelKey: 'admin.menu.financeRefundsReport', icon: FileText, iconColor: 'text-red-500' }),
        itemBlock({ path: '/admin/finance/audit-events', labelKey: 'admin.menu.financeAuditEvents', icon: ShieldCheck, iconColor: 'text-slate-500' }),
      ]),
    ],
  },
  {
    moduleId: 'storageCenter',
    groups: [
      groupBlock('admin.menu.storageCenter.configuration', [
        itemBlock({ path: '/admin/storage/providers', labelKey: 'admin.menu.storage.providers', icon: HardDrive, iconColor: 'text-cyan-500' }),
        itemBlock({ path: '/admin/storage/buckets', labelKey: 'admin.menu.storage.buckets', icon: Database, iconColor: 'text-blue-500' }),
        itemBlock({ path: '/admin/storage/default-buckets', labelKey: 'admin.menu.storage.defaultBuckets', icon: ShieldCheck, iconColor: 'text-emerald-500' }),
      ]),
      groupBlock('admin.menu.storageCenter.governance', [
        itemBlock({ path: '/admin/storage/quotas', labelKey: 'admin.menu.storage.quotas', icon: CreditCard, iconColor: 'text-amber-500' }),
        itemBlock({ path: '/admin/storage/usage', labelKey: 'admin.menu.storage.usage', icon: BarChart3, iconColor: 'text-indigo-500' }),
        itemBlock({ path: '/admin/storage/reconciliation', labelKey: 'admin.menu.storage.reconciliation', icon: ClipboardList, iconColor: 'text-teal-500' }),
        itemBlock({ path: '/admin/storage/garbage-collection', labelKey: 'admin.menu.storage.garbageCollection', icon: ShieldAlert, iconColor: 'text-red-500' }),
      ]),
    ],
  },
  {
    moduleId: 'driveCenter',
    groups: [
      groupBlock('admin.menu.driveCenter.library', [
        itemBlock({ path: '/admin/drive/spaces', labelKey: 'admin.menu.drive.spaces', icon: FolderOpen, iconColor: 'text-blue-500' }),
        itemBlock({ path: '/admin/drive/nodes', labelKey: 'admin.menu.drive.nodes', icon: Layers, iconColor: 'text-indigo-500' }),
      ]),
      groupBlock('admin.menu.driveCenter.governance', [
        itemBlock({ path: '/admin/drive/permissions', labelKey: 'admin.menu.drive.permissions', icon: KeyRound, iconColor: 'text-amber-500' }),
        itemBlock({ path: '/admin/drive/share-links', labelKey: 'admin.menu.drive.shareLinks', icon: Link2, iconColor: 'text-emerald-500' }),
        itemBlock({ path: '/admin/drive/audit', labelKey: 'admin.menu.drive.audit', icon: ShieldCheck, iconColor: 'text-slate-500' }),
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
      groupBlock('admin.menu.ops.oauth', [
        itemBlock({ path: '/admin/oauth/login-platforms', labelKey: 'admin.menu.oauth.loginPlatforms', icon: KeyRound, iconColor: 'text-indigo-500' }),
        itemBlock({ path: '/admin/oauth/official-accounts', labelKey: 'admin.menu.oauth.officialAccounts', icon: MessageCircle, iconColor: 'text-emerald-500' }),
        itemBlock({ path: '/admin/oauth/mini-programs', labelKey: 'admin.menu.oauth.miniPrograms', icon: Smartphone, iconColor: 'text-cyan-500' }),
      ]),
      groupBlock('admin.menu.ops.system', [
        itemBlock({ path: '/admin/settings', labelKey: 'admin.menu.authSettings', icon: ShieldCheck, iconColor: 'text-blue-500' }),
        itemBlock({ path: '/admin/runtime-region', labelKey: 'admin.menu.runtimeRegion', icon: Globe2, iconColor: 'text-cyan-500' }),
        itemBlock({ path: '/admin/site', labelKey: 'admin.menu.siteSettings', icon: Settings, iconColor: 'text-indigo-500' }),
      ]),
    ],
  },
  {
    moduleId: 'messagingCenter',
    groups: [
      groupBlock('admin.menu.messagingCenter.configuration', [
        itemBlock({ path: '/admin/messaging/providers', labelKey: 'admin.menu.messaging.providers', icon: MessageCircle, iconColor: 'text-cyan-500' }),
        itemBlock({ path: '/admin/messaging/sender-identities', labelKey: 'admin.menu.messaging.senderIdentities', icon: KeyRound, iconColor: 'text-sky-500' }),
        itemBlock({ path: '/admin/messaging/templates', labelKey: 'admin.menu.messaging.templates', icon: ClipboardList, iconColor: 'text-violet-500' }),
        itemBlock({ path: '/admin/messaging/route-rules', labelKey: 'admin.menu.messaging.routeRules', icon: Network, iconColor: 'text-amber-500' }),
      ]),
      groupBlock('admin.menu.messagingCenter.operations', [
        itemBlock({ path: '/admin/messaging/send-requests', labelKey: 'admin.menu.messaging.sendRequests', icon: Activity, iconColor: 'text-indigo-500' }),
        itemBlock({ path: '/admin/messaging/diagnostics', labelKey: 'admin.menu.messaging.diagnostics', icon: Settings, iconColor: 'text-slate-500' }),
      ]),
      groupBlock('admin.menu.messagingCenter.governance', [
        itemBlock({ path: '/admin/messaging/suppressions', labelKey: 'admin.menu.messaging.suppressions', icon: ShieldAlert, iconColor: 'text-red-500' }),
        itemBlock({ path: '/admin/messaging/rate-limits', labelKey: 'admin.menu.messaging.rateLimits', icon: CreditCard, iconColor: 'text-emerald-500' }),
        itemBlock({ path: '/admin/messaging/verification-policies', labelKey: 'admin.menu.messaging.verificationPolicies', icon: ShieldCheck, iconColor: 'text-blue-500' }),
      ]),
    ],
  },
  {
    moduleId: 'serviceProviderCenter',
    groups: [
      groupBlock('admin.menu.serviceProviderCenter.operations', [
        itemBlock({ path: '/admin/service-providers/dashboard', labelKey: 'admin.menu.serviceProvider.dashboard', icon: LayoutDashboard, iconColor: 'text-blue-500' }),
        itemBlock({ path: '/admin/service-providers/providers', labelKey: 'admin.menu.serviceProvider.providers', icon: Handshake, iconColor: 'text-cyan-500' }),
        itemBlock({ path: '/admin/service-providers/relations', labelKey: 'admin.menu.serviceProvider.relations', icon: Network, iconColor: 'text-violet-500' }),
        itemBlock({ path: '/admin/service-providers/downstreams', labelKey: 'admin.menu.serviceProvider.downstreams', icon: Users, iconColor: 'text-emerald-500' }),
      ]),
      groupBlock('admin.menu.serviceProviderCenter.governance', [
        itemBlock({ path: '/admin/service-providers/members', labelKey: 'admin.menu.serviceProvider.members', icon: UserCog, iconColor: 'text-sky-500' }),
        itemBlock({ path: '/admin/service-providers/bindings', labelKey: 'admin.menu.serviceProvider.bindings', icon: KeyRound, iconColor: 'text-amber-500' }),
        itemBlock({ path: '/admin/service-providers/contracts', labelKey: 'admin.menu.serviceProvider.contracts', icon: FileText, iconColor: 'text-slate-500' }),
        itemBlock({ path: '/admin/service-providers/pricing', labelKey: 'admin.menu.serviceProvider.pricing', icon: CreditCard, iconColor: 'text-lobster-500' }),
      ]),
      groupBlock('admin.menu.serviceProviderCenter.finance', [
        itemBlock({ path: '/admin/service-providers/usage', labelKey: 'admin.menu.serviceProvider.usage', icon: Activity, iconColor: 'text-indigo-500' }),
        itemBlock({ path: '/admin/service-providers/wallet', labelKey: 'admin.menu.serviceProvider.wallet', icon: CreditCard, iconColor: 'text-emerald-500' }),
        itemBlock({ path: '/admin/service-providers/statements', labelKey: 'admin.menu.serviceProvider.statements', icon: ClipboardList, iconColor: 'text-blue-500' }),
        itemBlock({ path: '/admin/service-providers/reconciliation', labelKey: 'admin.menu.serviceProvider.reconciliation', icon: BarChart3, iconColor: 'text-teal-500' }),
        itemBlock({ path: '/admin/service-providers/adjustments', labelKey: 'admin.menu.serviceProvider.adjustments', icon: FileText, iconColor: 'text-orange-500' }),
      ]),
      groupBlock('admin.menu.serviceProviderCenter.control', [
        itemBlock({ path: '/admin/service-providers/risk', labelKey: 'admin.menu.serviceProvider.risk', icon: ShieldAlert, iconColor: 'text-red-500' }),
        itemBlock({ path: '/admin/service-providers/audit', labelKey: 'admin.menu.serviceProvider.audit', icon: ShieldCheck, iconColor: 'text-slate-500' }),
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
  return ADMIN_MODULE_MENUS.find((menu) => menu.moduleId === moduleId) ?? ADMIN_MODULE_MENUS[0];
}
