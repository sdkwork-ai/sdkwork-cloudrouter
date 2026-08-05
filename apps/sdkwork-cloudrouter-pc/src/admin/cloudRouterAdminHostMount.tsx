import { lazy, type ComponentType, type LazyExoticComponent, type ReactElement } from 'react';
import { Navigate, Route, useParams } from 'react-router-dom';
import { IAM_ADMIN_ROUTE_RECORDS } from '@sdkwork/cloudrouter-pc-admin-iam/contribution';

export type CloudRouterAdminRouteContribution = {
  path: string;
  owner: 'sdkwork-cloudrouter' | 'sdkwork-models';
  adminPackage: `@sdkwork/${string}`;
  backendSdkFamilies: readonly string[];
  requiredPermission: string;
  element: ReactElement;
};

function lazyAdminRoute(
  loader: () => Promise<Record<string, unknown>>,
  exportName: string,
): LazyExoticComponent<ComponentType> {
  return lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as ComponentType };
  });
}

const DashboardAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-dashboard'), 'DashboardAdmin');
const AnalyticsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-analytics'), 'AnalyticsAdmin');
const CacheAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-cache'), 'CacheAdmin');
const UpstreamSupplierAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-upstream'), 'UpstreamSupplierAdmin');
const UpstreamAccountAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-upstream'), 'UpstreamAccountAdmin');
const UpstreamAccountGroupAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-upstream'), 'UpstreamAccountGroupAdmin');
const ModelAdmin = lazyAdminRoute(() => import('@sdkwork/models-pc-admin-catalog'), 'ModelAdmin');
const ModelMappingAdmin = lazyAdminRoute(() => import('@sdkwork/models-pc-admin-catalog'), 'ModelMappingAdmin');
const ResourceAdmin = lazyAdminRoute(() => import('@sdkwork/models-pc-admin-resource'), 'ResourceAdmin');
const RecordAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-record'), 'RecordAdmin');
const MonitorAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-monitor'), 'MonitorAdmin');
const RateLimitAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-ratelimit'), 'RateLimitAdmin');
const ServiceNodesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-service-nodes'), 'ServiceNodesAdmin');
const RuntimeRegionAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-runtime-region'), 'RuntimeRegionAdmin');
const CloudRouterAuthSettingsPage = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-site'), 'CloudRouterAuthSettingsPage');
const CloudRouterSiteSettingsPage = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-site'), 'CloudRouterSiteSettingsPage');
const MembershipsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-memberships'), 'MembershipsAdmin');
const MarketingAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-marketing'), 'MarketingAdmin');
const PaymentsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-payments'), 'PaymentsAdmin');
const StorageAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-storage'), 'StorageAdmin');
const IamUsersAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamUsersAdmin');
const IamTenantsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamTenantsAdmin');
const IamOrganizationsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOrganizationsAdmin');
const IamOrganizationStructureAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOrganizationStructureAdmin');
const IamRolesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamRolesAdmin');
const IamPermissionsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamPermissionsAdmin');
const IamPoliciesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamPoliciesAdmin');
const IamAuthorizationsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamAuthorizationsAdmin');
const IamOauthAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthAdmin');
const IamOauthProviderConnectionsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthProviderConnectionsAdmin');
const IamOauthMiniProgramsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthMiniProgramsAdmin');
const IamOauthOfficialAccountsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthOfficialAccountsAdmin');
const IamOauthScanLoginAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthScanLoginAdmin');
const IamAccountBindingAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamAccountBindingAdmin');
const IamAuditAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamAuditAdmin');

/**
 * Lazy route elements for the IAM admin module; paths mirror
 * @sdkwork/cloudrouter-pc-admin-iam IAM_ADMIN_ROUTE_RECORDS. The bare `iam`
 * record is a redirect handled by `IAM_ADMIN_ROUTE_RECORDS[].redirectTo`.
 */
const IAM_ADMIN_ROUTE_ELEMENTS: Readonly<Record<string, ReactElement>> = {
  'iam/users': <IamUsersAdmin />,
  'iam/tenants': <IamTenantsAdmin />,
  'iam/organizations': <IamOrganizationsAdmin />,
  'iam/organizations/:organizationId/structure': <IamOrganizationStructureAdmin />,
  'iam/roles': <IamRolesAdmin />,
  'iam/permissions': <IamPermissionsAdmin />,
  'iam/policies': <IamPoliciesAdmin />,
  'iam/authorizations': <IamAuthorizationsAdmin />,
  'iam/oauth': <IamOauthAdmin />,
  'iam/oauth/providers': <IamOauthProviderConnectionsAdmin />,
  'iam/oauth/mini-programs': <IamOauthMiniProgramsAdmin />,
  'iam/oauth/official-accounts': <IamOauthOfficialAccountsAdmin />,
  'iam/oauth/scan-login': <IamOauthScanLoginAdmin />,
  'iam/account-binding': <IamAccountBindingAdmin />,
  'iam/audit': <IamAuditAdmin />,
};

export const CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS: readonly CloudRouterAdminRouteContribution[] = [
  route('dashboard', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-dashboard', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <DashboardAdmin />),
  route('analytics', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-analytics', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <AnalyticsAdmin />),
  route('upstream', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-upstream', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <Navigate to="/admin/upstream/suppliers" replace />),
  route('upstream/suppliers', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-upstream', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <UpstreamSupplierAdmin />),
  route('upstream/accounts', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-upstream', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <UpstreamAccountAdmin />),
  route('upstream/account-groups', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-upstream', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <UpstreamAccountGroupAdmin />),
  route('model', 'sdkwork-models', '@sdkwork/models-pc-admin-catalog', ['sdkwork-models-backend-sdk'], 'cloudrouter.admin.access', <ModelAdmin />),
  route('model/resources', 'sdkwork-models', '@sdkwork/models-pc-admin-resource', ['sdkwork-models-backend-sdk'], 'cloudrouter.admin.access', <ResourceAdmin />),
  route('model/mappings', 'sdkwork-models', '@sdkwork/models-pc-admin-catalog', ['sdkwork-models-backend-sdk'], 'cloudrouter.admin.access', <ModelMappingAdmin />),
  route('record', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-record', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <RecordAdmin />),
  route('monitor', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-monitor', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <MonitorAdmin />),
  route('cache', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-cache', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <CacheAdmin />),
  route('ratelimit', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-ratelimit', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <RateLimitAdmin />),
  route('service-nodes', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-service-nodes', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <ServiceNodesAdmin />),
  route('settings', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-site', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <CloudRouterAuthSettingsPage />),
  route('runtime-region', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-runtime-region', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <RuntimeRegionAdmin />),
  route('site', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-site', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <CloudRouterSiteSettingsPage />),
  route('memberships/:sectionId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-memberships', ['sdkwork-membership-backend-sdk', 'cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={MembershipsAdmin} />),
  route('marketing/:sectionId?/:batchId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-marketing', ['sdkwork-promotion-backend-sdk', 'cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminMarketingRoute component={MarketingAdmin} />),
  route('payments/:sectionId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-payments', ['sdkwork-payment-backend-sdk', 'cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={PaymentsAdmin} />),
  route('storage/:sectionId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-storage', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={StorageAdmin} />),
  ...IAM_ADMIN_ROUTE_RECORDS.map((record) =>
    route(
      record.path,
      'sdkwork-cloudrouter',
      '@sdkwork/cloudrouter-pc-admin-iam',
      ['sdkwork-iam-backend-sdk'],
      record.requiredPermission,
      record.redirectTo
        ? <Navigate to={record.redirectTo} replace />
        : IAM_ADMIN_ROUTE_ELEMENTS[record.path]!,
    ),
  ),
];

function AdminSectionRoute({ component: Component }: { component: ComponentType<{ sectionId?: string }> }) {
  const { sectionId } = useParams<{ sectionId?: string }>();
  return <Component sectionId={sectionId} />;
}

function AdminMarketingRoute({ component: Component }: { component: ComponentType<{ sectionId?: string; batchId?: string }> }) {
  const { sectionId, batchId } = useParams<{ sectionId?: string; batchId?: string }>();
  return <Component sectionId={sectionId} batchId={batchId} />;
}

function route(
  path: string,
  owner: CloudRouterAdminRouteContribution['owner'],
  adminPackage: CloudRouterAdminRouteContribution['adminPackage'],
  backendSdkFamilies: readonly string[],
  requiredPermission: string,
  element: ReactElement,
): CloudRouterAdminRouteContribution {
  return { path, owner, adminPackage, backendSdkFamilies, requiredPermission, element };
}

export function CloudRouterAdminHostRoutes(): ReactElement[] {
  return CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS.map((contribution) => (
    <Route key={contribution.path} path={contribution.path} element={contribution.element} />
  ));
}
