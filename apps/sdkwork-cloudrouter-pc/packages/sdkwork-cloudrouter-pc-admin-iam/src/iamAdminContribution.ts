import { Building2, KeyRound, KeySquare, Link2, MessageCircle, Network, QrCode, ScrollText, ShieldAlert, ShieldCheck, Smartphone, UserCog, Users, type LucideIcon } from 'lucide-react';

/**
 * Cloud Router IAM admin contribution metadata.
 *
 * Per BACKEND_UI_SPEC, route records, menu records, and permission constants
 * for a backend-admin domain package stay in the owning package; the host
 * shell only composes them. The shell registers this contribution by spreading
 * these records into its module registry, permission hints, and route table.
 */

export const IAM_ADMIN_DEFAULT_PATH = '/admin/iam/users';

export interface CloudRouterIamAdminModuleDef {
  id: 'iam';
  nameKey: string;
  icon: LucideIcon;
  defaultPath: string;
  pathPrefixes: string[];
}

export const IAM_ADMIN_MODULE_DEF: CloudRouterIamAdminModuleDef = {
  id: 'iam',
  nameKey: 'admin.header.iam',
  icon: ShieldCheck,
  defaultPath: IAM_ADMIN_DEFAULT_PATH,
  pathPrefixes: ['/admin/iam'],
};

export interface CloudRouterIamAdminMenuItem {
  path: string;
  labelKey: string;
  icon: LucideIcon;
  iconColor?: string;
}

export interface CloudRouterIamAdminMenuGroup {
  groupKey: string;
  items: CloudRouterIamAdminMenuItem[];
}

export interface CloudRouterIamAdminMenu {
  moduleId: 'iam';
  groups: CloudRouterIamAdminMenuGroup[];
}

export const IAM_ADMIN_MENU: CloudRouterIamAdminMenu = {
  moduleId: 'iam',
  groups: [
    {
      groupKey: 'admin.menu.iam.directory',
      items: [
        { path: '/admin/iam/users', labelKey: 'admin.menu.iam.users', icon: Users },
        { path: '/admin/iam/organizations', labelKey: 'admin.menu.iam.organizations', icon: Building2 },
        { path: '/admin/iam/tenants', labelKey: 'admin.menu.iam.tenants', icon: Network },
      ],
    },
    {
      groupKey: 'admin.menu.iam.accessControl',
      items: [
        { path: '/admin/iam/roles', labelKey: 'admin.menu.iam.roles', icon: UserCog },
        { path: '/admin/iam/permissions', labelKey: 'admin.menu.iam.permissions', icon: ShieldCheck },
        { path: '/admin/iam/policies', labelKey: 'admin.menu.iam.policies', icon: ScrollText },
        { path: '/admin/iam/authorizations', labelKey: 'admin.menu.iam.authorizations', icon: KeySquare },
      ],
    },
    {
      groupKey: 'admin.menu.iam.oauth',
      items: [
        { path: '/admin/iam/oauth/providers', labelKey: 'admin.menu.iam.oauth.providers', icon: KeyRound },
        { path: '/admin/iam/oauth/mini-programs', labelKey: 'admin.menu.iam.oauth.miniPrograms', icon: Smartphone },
        { path: '/admin/iam/oauth/official-accounts', labelKey: 'admin.menu.iam.oauth.officialAccounts', icon: MessageCircle },
        { path: '/admin/iam/oauth/scan-login', labelKey: 'admin.menu.iam.oauth.scanLogin', icon: QrCode },
      ],
    },
    {
      groupKey: 'admin.menu.iam.federation',
      items: [
        { path: '/admin/iam/account-binding', labelKey: 'admin.menu.iam.accountBinding', icon: Link2 },
      ],
    },
    {
      groupKey: 'admin.menu.iam.security',
      items: [
        { path: '/admin/iam/audit', labelKey: 'admin.menu.iam.audit', icon: ShieldAlert },
      ],
    },
  ],
};

export interface CloudRouterIamAdminRouteRecord {
  path: string;
  requiredPermission: string;
  redirectTo?: string;
}

export const IAM_ADMIN_ROUTE_RECORDS: readonly CloudRouterIamAdminRouteRecord[] = [
  { path: 'iam', requiredPermission: 'iam.users.read', redirectTo: '/admin/iam/users' },
  { path: 'iam/users', requiredPermission: 'iam.users.read' },
  { path: 'iam/tenants', requiredPermission: 'iam.tenants.read' },
  { path: 'iam/organizations', requiredPermission: 'iam.organizations.read' },
  { path: 'iam/organizations/:organizationId/structure', requiredPermission: 'iam.organizations.read' },
  { path: 'iam/roles', requiredPermission: 'iam.roles.read' },
  { path: 'iam/permissions', requiredPermission: 'iam.permissions.read' },
  { path: 'iam/policies', requiredPermission: 'iam.policies.read' },
  { path: 'iam/authorizations', requiredPermission: 'iam.role_bindings.read' },
  { path: 'iam/oauth', requiredPermission: 'iam.oauth.read', redirectTo: '/admin/iam/oauth/providers' },
  { path: 'iam/oauth/providers', requiredPermission: 'iam.oauth.read' },
  { path: 'iam/oauth/mini-programs', requiredPermission: 'iam.oauth.read' },
  { path: 'iam/oauth/official-accounts', requiredPermission: 'iam.oauth.read' },
  { path: 'iam/oauth/scan-login', requiredPermission: 'iam.oauth.read' },
  { path: 'iam/account-binding', requiredPermission: 'iam.account_binding_policy.read' },
  { path: 'iam/audit', requiredPermission: 'iam.audit_events.read' },
];

export interface CloudRouterIamAdminPermissionHint {
  pathPrefix: string;
  requiredPermission: string;
}

export const IAM_ADMIN_PERMISSION_HINTS: readonly CloudRouterIamAdminPermissionHint[] = [
  { pathPrefix: '/admin/iam', requiredPermission: 'iam.users.read' },
  { pathPrefix: '/admin/iam/users', requiredPermission: 'iam.users.read' },
  { pathPrefix: '/admin/iam/tenants', requiredPermission: 'iam.tenants.read' },
  { pathPrefix: '/admin/iam/organizations', requiredPermission: 'iam.organizations.read' },
  { pathPrefix: '/admin/iam/roles', requiredPermission: 'iam.roles.read' },
  { pathPrefix: '/admin/iam/permissions', requiredPermission: 'iam.permissions.read' },
  { pathPrefix: '/admin/iam/policies', requiredPermission: 'iam.policies.read' },
  { pathPrefix: '/admin/iam/authorizations', requiredPermission: 'iam.role_bindings.read' },
  { pathPrefix: '/admin/iam/oauth', requiredPermission: 'iam.oauth.read' },
  { pathPrefix: '/admin/iam/oauth/providers', requiredPermission: 'iam.oauth.read' },
  { pathPrefix: '/admin/iam/oauth/mini-programs', requiredPermission: 'iam.oauth.read' },
  { pathPrefix: '/admin/iam/oauth/official-accounts', requiredPermission: 'iam.oauth.read' },
  { pathPrefix: '/admin/iam/oauth/scan-login', requiredPermission: 'iam.oauth.read' },
  { pathPrefix: '/admin/iam/account-binding', requiredPermission: 'iam.account_binding_policy.read' },
  { pathPrefix: '/admin/iam/audit', requiredPermission: 'iam.audit_events.read' },
];
