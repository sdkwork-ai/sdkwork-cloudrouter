import {
  Activity,
  Building2,
  FileAudio,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Plug,
  Radio,
  Route,
  ScrollText,
  Settings2,
  ShieldCheck,
  TerminalSquare,
  Users,
  Video,
  Wand2,
  Webhook,
  type LucideIcon,
} from 'lucide-react';

/**
 * Cloud Router RTC admin contribution metadata — 实时音视频中心.
 *
 * Per BACKEND_UI_SPEC, route records, menu records, and permission constants
 * for a backend-admin domain package stay in the owning package; the host
 * shell only composes them. All RTC admin page orchestration lives in
 * `@sdkwork/rtc-pc-admin-core` (RtcAdminCenterWorkspace); this package only
 * wires it into the Cloud Router admin surface with an injected service.
 */

export const RTC_ADMIN_DEFAULT_PATH = '/admin/rtc/media-sessions';

export interface CloudRouterRtcAdminModuleDef {
  id: 'rtc';
  nameKey: string;
  icon: LucideIcon;
  defaultPath: string;
  pathPrefixes: string[];
}

export const RTC_ADMIN_MODULE_DEF: CloudRouterRtcAdminModuleDef = {
  id: 'rtc',
  nameKey: 'admin.header.rtcCenter',
  icon: Video,
  defaultPath: RTC_ADMIN_DEFAULT_PATH,
  pathPrefixes: ['/admin/rtc'],
};

export interface CloudRouterRtcAdminMenuItem {
  path: string;
  labelKey: string;
  icon: LucideIcon;
  iconColor?: string;
}

export interface CloudRouterRtcAdminMenuGroup {
  groupKey: string;
  items: CloudRouterRtcAdminMenuItem[];
}

export interface CloudRouterRtcAdminMenu {
  moduleId: 'rtc';
  groups: CloudRouterRtcAdminMenuGroup[];
}

export const RTC_ADMIN_MENU: CloudRouterRtcAdminMenu = {
  moduleId: 'rtc',
  groups: [
    {
      groupKey: 'admin.menu.rtc.realtime',
      items: [
        { path: '/admin/rtc/dashboard', labelKey: 'admin.menu.rtc.dashboard', icon: LayoutDashboard },
        { path: '/admin/rtc/media-sessions', labelKey: 'admin.menu.rtc.sessions', icon: Radio },
        { path: '/admin/rtc/rooms', labelKey: 'admin.menu.rtc.rooms', icon: Users },
        { path: '/admin/rtc/media-artifacts', labelKey: 'admin.menu.rtc.artifacts', icon: FileAudio },
        { path: '/admin/rtc/quality-samples', labelKey: 'admin.menu.rtc.quality', icon: Gauge },
      ],
    },
    {
      groupKey: 'admin.menu.rtc.provider',
      items: [
        { path: '/admin/rtc/provider-accounts', labelKey: 'admin.menu.rtc.providerAccounts', icon: Building2 },
        { path: '/admin/rtc/provider-applications', labelKey: 'admin.menu.rtc.providerApplications', icon: Plug },
        { path: '/admin/rtc/provider-credentials', labelKey: 'admin.menu.rtc.providerCredentials', icon: KeyRound },
        { path: '/admin/rtc/provider-profiles', labelKey: 'admin.menu.rtc.providerProfiles', icon: Settings2 },
        { path: '/admin/rtc/provider-routes', labelKey: 'admin.menu.rtc.providerRoutes', icon: Route },
        { path: '/admin/rtc/providers', labelKey: 'admin.menu.rtc.providers', icon: ShieldCheck },
        { path: '/admin/rtc/wizard', labelKey: 'admin.menu.rtc.wizard', icon: Wand2 },
      ],
    },
    {
      groupKey: 'admin.menu.rtc.system',
      items: [
        { path: '/admin/rtc/webhook-events', labelKey: 'admin.menu.rtc.webhookEvents', icon: Webhook },
        { path: '/admin/rtc/query-jobs', labelKey: 'admin.menu.rtc.queryJobs', icon: TerminalSquare },
      ],
    },
  ],
};

export interface CloudRouterRtcAdminRouteRecord {
  path: string;
  requiredPermission: string;
  redirectTo?: string;
}

export const RTC_ADMIN_ROUTE_RECORDS: readonly CloudRouterRtcAdminRouteRecord[] = [
  { path: 'rtc', requiredPermission: 'cloudrouter.admin.access', redirectTo: RTC_ADMIN_DEFAULT_PATH },
  { path: 'rtc/dashboard', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/media-sessions', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/media-sessions/:mediaSessionId', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/rooms', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/rooms/:roomId', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/media-artifacts', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/media-artifacts/:mediaArtifactId', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/quality-samples', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/provider-accounts', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/provider-applications', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/provider-credentials', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/provider-profiles', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/provider-routes', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/providers', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/wizard', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/webhook-events', requiredPermission: 'cloudrouter.admin.access' },
  { path: 'rtc/query-jobs', requiredPermission: 'cloudrouter.admin.access' },
];

export interface CloudRouterRtcAdminPermissionHint {
  pathPrefix: string;
  requiredPermission: string;
}

export const RTC_ADMIN_PERMISSION_HINTS: readonly CloudRouterRtcAdminPermissionHint[] = [
  { pathPrefix: '/admin/rtc', requiredPermission: 'cloudrouter.admin.access' },
];
