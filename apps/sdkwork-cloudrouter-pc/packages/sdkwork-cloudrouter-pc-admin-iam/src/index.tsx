import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  readPortalPermissionScope,
  resolveStoredPortalTenantId,
  subscribePortalSessionChange,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { hasPermissionInScope } from '@sdkwork/iam-contracts';
import type { SdkworkIamService } from '@sdkwork/iam-service';

import { getCloudRouterIamAdminService } from './iamService';

export { IAM_ADMIN_DEFAULT_PATH } from './iamAdminContribution';

/**
 * IAM admin capability integration for the Cloud Router admin surface.
 *
 * Each exported route component lazy-loads the matching `@sdkwork/iam-pc-admin-*`
 * capability workspace and wires it with the portal's shared IAM service,
 * permission scope, and locale. Workspaces never create HTTP clients; all
 * remote calls flow through `getCloudRouterIamAdminService()`.
 */

function IamAdminRouteLoading() {
  const { t } = useTranslation();
  return (
    <div
      className="flex min-h-full flex-col items-center justify-center gap-3 px-6 py-24 text-center"
      role="status"
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('admin.iam.loading')}</p>
    </div>
  );
}

function useIamAdminService(): SdkworkIamService {
  return useMemo(() => getCloudRouterIamAdminService(), []);
}

function useIamAdminLocale(): string {
  const { i18n } = useTranslation();
  // IAM capability catalogs ship en-US/zh-CN only; other portal locales fall back to English.
  return i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';
}

function useIamAdminPermissionScope(): readonly string[] {
  const [permissionScope, setPermissionScope] = useState(() => readPortalPermissionScope());
  useEffect(() => {
    const syncPermissionScope = () => setPermissionScope(readPortalPermissionScope());
    syncPermissionScope();
    return subscribePortalSessionChange(syncPermissionScope);
  }, []);
  return permissionScope;
}

function useIamAdminPermission(): (permission: string) => boolean {
  const permissionScope = useIamAdminPermissionScope();
  return (permission) => hasPermissionInScope(permissionScope, permission);
}

function createIamAdminRoute(LazyComponent: LazyExoticComponent<ComponentType>): ComponentType {
  return function CloudRouterIamAdminRouteEntry() {
    return (
      <Suspense fallback={<IamAdminRouteLoading />}>
        <LazyComponent />
      </Suspense>
    );
  };
}

const LazyIamUsersAdmin = lazy(async () => {
  const { createSdkworkIamUserAdminController, SdkworkIamUserAdminWorkspace } = await import('@sdkwork/iam-pc-admin-user');
  return {
    default: function CloudRouterIamUsersAdminContent() {
      const service = useIamAdminService();
      const locale = useIamAdminLocale();
      const can = useIamAdminPermission();
      const controller = useMemo(() => createSdkworkIamUserAdminController(service), [service]);
      return (
        <SdkworkIamUserAdminWorkspace
          controller={controller}
          locale={locale}
          permissions={{
            create: can('iam.users.create'),
            delete: can('iam.users.delete'),
            update: can('iam.users.update'),
          }}
        />
      );
    },
  };
});

const LazyIamTenantsAdmin = lazy(async () => {
  const { createSdkworkIamTenantController, SdkworkIamTenantAdminWorkspace } = await import('@sdkwork/iam-pc-admin-tenant');
  return {
    default: function CloudRouterIamTenantsAdminContent() {
      const service = useIamAdminService();
      const permissionScope = useIamAdminPermissionScope();
      const can = useIamAdminPermission();
      const controller = useMemo(
        () => createSdkworkIamTenantController({ permissionScope, service }),
        [permissionScope, service],
      );
      return (
        <SdkworkIamTenantAdminWorkspace
          controller={controller}
          permissions={{
            members: {
              create: can('iam.tenant_members.create'),
              delete: can('iam.tenant_members.delete'),
              read: can('iam.tenant_members.read'),
              update: can('iam.tenant_members.update'),
            },
            tenants: {
              create: can('iam.tenants.create'),
              delete: can('iam.tenants.delete'),
              update: can('iam.tenants.update'),
            },
          }}
        />
      );
    },
  };
});

const LazyIamApplicationsAdmin = lazy(async () => {
  const { createSdkworkIamTenantController, SdkworkIamTenantApplicationsAdminWorkspace } = await import('@sdkwork/iam-pc-admin-tenant');
  return {
    default: function CloudRouterIamApplicationsAdminContent() {
      const service = useIamAdminService();
      const permissionScope = useIamAdminPermissionScope();
      // The applications page targets the operator's current tenant; the
      // session-scoped tenant id seeds the controller's initial selection so
      // no tenant picker is rendered.
      const selectedTenantId = useMemo(resolveStoredPortalTenantId, []);
      const controller = useMemo(
        () => createSdkworkIamTenantController({ permissionScope, selectedTenantId, service }),
        [permissionScope, selectedTenantId, service],
      );
      return <SdkworkIamTenantApplicationsAdminWorkspace controller={controller} />;
    },
  };
});

const LazyIamOrganizationsAdmin = lazy(async () => {
  const { createSdkworkIamOrganizationController, SdkworkIamOrganizationAdminWorkspace } = await import('@sdkwork/iam-pc-admin-organization');
  return {
    default: function CloudRouterIamOrganizationsAdminContent() {
      const service = useIamAdminService();
      const can = useIamAdminPermission();
      const controller = useMemo(() => createSdkworkIamOrganizationController(service), [service]);
      const navigate = useNavigate();
      return (
        <SdkworkIamOrganizationAdminWorkspace
          controller={controller}
          onOpenStructure={(organization) =>
            navigate(`/admin/iam/organizations/${encodeURIComponent(organization.organizationId)}/structure`)}
          permissions={{
            departments: {
              create: can('iam.departments.create'),
              delete: can('iam.departments.delete'),
              read: can('iam.departments.read'),
              update: can('iam.departments.update'),
            },
            memberships: {
              create: can('iam.memberships.create'),
              read: can('iam.memberships.read'),
              update: can('iam.memberships.update'),
            },
            organizations: {
              create: can('iam.organizations.create'),
              delete: can('iam.organizations.delete'),
              update: can('iam.organizations.update'),
            },
            positions: { read: can('iam.positions.read') },
            roleBindings: { read: can('iam.role_bindings.read') },
          }}
        />
      );
    },
  };
});

const LazyIamOrganizationStructureAdmin = lazy(async () => {
  const { createSdkworkIamOrganizationController, SdkworkIamOrganizationStructureWorkspace } = await import('@sdkwork/iam-pc-admin-organization');
  return {
    default: function CloudRouterIamOrganizationStructureAdminContent() {
      const service = useIamAdminService();
      const can = useIamAdminPermission();
      const controller = useMemo(() => createSdkworkIamOrganizationController(service), [service]);
      const navigate = useNavigate();
      const { organizationId } = useParams<{ organizationId: string }>();
      if (!organizationId) {
        return null;
      }
      return (
        <SdkworkIamOrganizationStructureWorkspace
          controller={controller}
          onBack={() => navigate('/admin/iam/organizations')}
          organizationId={organizationId}
          permissions={{
            assignments: {
              create: can('iam.assignments.create'),
              read: can('iam.assignments.read'),
              update: can('iam.assignments.update'),
            },
            departments: {
              create: can('iam.departments.create'),
              delete: can('iam.departments.delete'),
              update: can('iam.departments.update'),
            },
            memberships: { read: can('iam.memberships.read') },
          }}
        />
      );
    },
  };
});

const LazyIamRolesAdmin = lazy(async () => {
  const { createSdkworkIamPermissionController, SdkworkIamRoleAdminWorkspace } = await import('@sdkwork/iam-pc-admin-permission');
  return {
    default: function CloudRouterIamRolesAdminContent() {
      const service = useIamAdminService();
      const permissionScope = useIamAdminPermissionScope();
      const locale = useIamAdminLocale();
      const can = useIamAdminPermission();
      const controller = useMemo(
        () => createSdkworkIamPermissionController({ permissionScope, service }),
        [permissionScope, service],
      );
      return (
        <SdkworkIamRoleAdminWorkspace
          controller={controller}
          locale={locale}
          permissions={{
            roleBindings: {
              create: can('iam.role_bindings.create'),
              delete: can('iam.role_bindings.delete'),
            },
            rolePermissions: {
              create: can('iam.role_permissions.create'),
              delete: can('iam.role_permissions.delete'),
            },
            roles: {
              create: can('iam.roles.create'),
              delete: can('iam.roles.delete'),
              update: can('iam.roles.update'),
            },
          }}
        />
      );
    },
  };
});

const LazyIamPermissionsAdmin = lazy(async () => {
  const { createSdkworkIamPermissionController, SdkworkIamPermissionAdminWorkspace } = await import('@sdkwork/iam-pc-admin-permission');
  return {
    default: function CloudRouterIamPermissionsAdminContent() {
      const service = useIamAdminService();
      const permissionScope = useIamAdminPermissionScope();
      const locale = useIamAdminLocale();
      const can = useIamAdminPermission();
      const controller = useMemo(
        () => createSdkworkIamPermissionController({ permissionScope, service }),
        [permissionScope, service],
      );
      return (
        <SdkworkIamPermissionAdminWorkspace
          controller={controller}
          locale={locale}
          permissions={{
            permissions: {
              create: can('iam.permissions.create'),
              delete: can('iam.permissions.delete'),
              update: can('iam.permissions.update'),
            },
          }}
        />
      );
    },
  };
});

const LazyIamPoliciesAdmin = lazy(async () => {
  const { createSdkworkIamPermissionController, SdkworkIamPolicyAdminWorkspace } = await import('@sdkwork/iam-pc-admin-permission');
  return {
    default: function CloudRouterIamPoliciesAdminContent() {
      const service = useIamAdminService();
      const permissionScope = useIamAdminPermissionScope();
      const locale = useIamAdminLocale();
      const can = useIamAdminPermission();
      const controller = useMemo(
        () => createSdkworkIamPermissionController({ permissionScope, service }),
        [permissionScope, service],
      );
      return (
        <SdkworkIamPolicyAdminWorkspace
          controller={controller}
          locale={locale}
          permissions={{
            policies: {
              create: can('iam.policies.create'),
              delete: can('iam.policies.delete'),
              update: can('iam.policies.update'),
            },
          }}
        />
      );
    },
  };
});

const LazyIamAuthorizationsAdmin = lazy(async () => {
  const { createSdkworkIamPermissionController, SdkworkIamAuthorizationAdminWorkspace } = await import('@sdkwork/iam-pc-admin-permission');
  return {
    default: function CloudRouterIamAuthorizationsAdminContent() {
      const service = useIamAdminService();
      const permissionScope = useIamAdminPermissionScope();
      const locale = useIamAdminLocale();
      const can = useIamAdminPermission();
      const controller = useMemo(
        () => createSdkworkIamPermissionController({ permissionScope, service }),
        [permissionScope, service],
      );
      return (
        <SdkworkIamAuthorizationAdminWorkspace
          controller={controller}
          locale={locale}
          permissions={{
            roleBindings: {
              create: can('iam.role_bindings.create'),
              delete: can('iam.role_bindings.delete'),
            },
          }}
        />
      );
    },
  };
});

const LazyIamOauthAdmin = lazy(async () => {
  const { createSdkworkIamOauthAdminController, SdkworkIamOauthAdminWorkspace } = await import('@sdkwork/iam-pc-admin-oauth');
  return {
    default: function CloudRouterIamOauthAdminContent() {
      const service = useIamAdminService();
      const controller = useMemo(() => createSdkworkIamOauthAdminController(service), [service]);
      return <SdkworkIamOauthAdminWorkspace controller={controller} />;
    },
  };
});

const LazyIamOauthProviderConnectionsAdmin = lazy(async () => {
  const { createSdkworkIamOauthAdminController, SdkworkIamOauthProviderConnectionsPage } = await import('@sdkwork/iam-pc-admin-oauth');
  return {
    default: function CloudRouterIamOauthProviderConnectionsAdminContent() {
      const service = useIamAdminService();
      const controller = useMemo(() => createSdkworkIamOauthAdminController(service), [service]);
      return <SdkworkIamOauthProviderConnectionsPage controller={controller} />;
    },
  };
});

const LazyIamOauthMiniProgramsAdmin = lazy(async () => {
  const { createSdkworkIamOauthAdminController, SdkworkIamOauthMiniProgramAccountsPage } = await import('@sdkwork/iam-pc-admin-oauth');
  return {
    default: function CloudRouterIamOauthMiniProgramsAdminContent() {
      const service = useIamAdminService();
      const controller = useMemo(() => createSdkworkIamOauthAdminController(service), [service]);
      return <SdkworkIamOauthMiniProgramAccountsPage controller={controller} />;
    },
  };
});

const LazyIamOauthOfficialAccountsAdmin = lazy(async () => {
  const { createSdkworkIamOauthAdminController, SdkworkIamOauthOfficialAccountsPage } = await import('@sdkwork/iam-pc-admin-oauth');
  return {
    default: function CloudRouterIamOauthOfficialAccountsAdminContent() {
      const service = useIamAdminService();
      const controller = useMemo(() => createSdkworkIamOauthAdminController(service), [service]);
      // The custom menu manager opens as a full-screen modal inside the page;
      // the dedicated route below remains for deep links.
      return <SdkworkIamOauthOfficialAccountsPage controller={controller} />;
    },
  };
});

const LazyIamOauthOfficialAccountCustomMenuAdmin = lazy(async () => {
  const { createSdkworkIamOauthAdminController, SdkworkIamOauthOfficialAccountCustomMenuPage } = await import('@sdkwork/iam-pc-admin-oauth');
  return {
    default: function CloudRouterIamOauthOfficialAccountCustomMenuAdminContent() {
      const service = useIamAdminService();
      const navigate = useNavigate();
      const { resourceAccountId } = useParams<{ resourceAccountId: string }>();
      const controller = useMemo(() => createSdkworkIamOauthAdminController(service), [service]);
      if (!resourceAccountId) {
        return null;
      }
      return (
        <SdkworkIamOauthOfficialAccountCustomMenuPage
          controller={controller}
          onBack={() => navigate('/admin/iam/oauth/official-accounts')}
          resourceAccountId={resourceAccountId}
        />
      );
    },
  };
});

const LazyIamOauthScanLoginAdmin = lazy(async () => {
  const { createSdkworkIamOauthAdminController, SdkworkIamOauthScanLoginSettingsPage } = await import('@sdkwork/iam-pc-admin-oauth');
  return {
    default: function CloudRouterIamOauthScanLoginAdminContent() {
      const service = useIamAdminService();
      const controller = useMemo(() => createSdkworkIamOauthAdminController(service), [service]);
      return <SdkworkIamOauthScanLoginSettingsPage controller={controller} />;
    },
  };
});

const LazyIamAccountBindingAdmin = lazy(async () => {
  const { createSdkworkIamAccountBindingController, SdkworkIamAccountBindingSettings } = await import('@sdkwork/iam-pc-admin-account-binding');
  return {
    default: function CloudRouterIamAccountBindingAdminContent() {
      const service = useIamAdminService();
      const controller = useMemo(() => createSdkworkIamAccountBindingController(service), [service]);
      return <SdkworkIamAccountBindingSettings controller={controller} />;
    },
  };
});

const LazyIamAuditAdmin = lazy(async () => {
  const { createSdkworkIamAuditController, SdkworkIamAuditAdminWorkspace } = await import('@sdkwork/iam-pc-admin-audit');
  return {
    default: function CloudRouterIamAuditAdminContent() {
      const service = useIamAdminService();
      const controller = useMemo(() => createSdkworkIamAuditController(service), [service]);
      return <SdkworkIamAuditAdminWorkspace controller={controller} />;
    },
  };
});

export const CloudRouterIamUsersAdmin: ComponentType = createIamAdminRoute(LazyIamUsersAdmin);
export const CloudRouterIamTenantsAdmin: ComponentType = createIamAdminRoute(LazyIamTenantsAdmin);
export const CloudRouterIamApplicationsAdmin: ComponentType = createIamAdminRoute(LazyIamApplicationsAdmin);
export const CloudRouterIamOrganizationsAdmin: ComponentType = createIamAdminRoute(LazyIamOrganizationsAdmin);
export const CloudRouterIamOrganizationStructureAdmin: ComponentType = createIamAdminRoute(LazyIamOrganizationStructureAdmin);
export const CloudRouterIamRolesAdmin: ComponentType = createIamAdminRoute(LazyIamRolesAdmin);
export const CloudRouterIamPermissionsAdmin: ComponentType = createIamAdminRoute(LazyIamPermissionsAdmin);
export const CloudRouterIamPoliciesAdmin: ComponentType = createIamAdminRoute(LazyIamPoliciesAdmin);
export const CloudRouterIamAuthorizationsAdmin: ComponentType = createIamAdminRoute(LazyIamAuthorizationsAdmin);
export const CloudRouterIamOauthAdmin: ComponentType = createIamAdminRoute(LazyIamOauthAdmin);
export const CloudRouterIamOauthProviderConnectionsAdmin: ComponentType = createIamAdminRoute(LazyIamOauthProviderConnectionsAdmin);
export const CloudRouterIamOauthMiniProgramsAdmin: ComponentType = createIamAdminRoute(LazyIamOauthMiniProgramsAdmin);
export const CloudRouterIamOauthOfficialAccountsAdmin: ComponentType = createIamAdminRoute(LazyIamOauthOfficialAccountsAdmin);
export const CloudRouterIamOauthOfficialAccountCustomMenuAdmin: ComponentType = createIamAdminRoute(LazyIamOauthOfficialAccountCustomMenuAdmin);
export const CloudRouterIamOauthScanLoginAdmin: ComponentType = createIamAdminRoute(LazyIamOauthScanLoginAdmin);
export const CloudRouterIamAccountBindingAdmin: ComponentType = createIamAdminRoute(LazyIamAccountBindingAdmin);
export const CloudRouterIamAuditAdmin: ComponentType = createIamAdminRoute(LazyIamAuditAdmin);
