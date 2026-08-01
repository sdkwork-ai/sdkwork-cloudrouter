import { lazy, type ComponentType, type LazyExoticComponent, type ReactElement } from 'react';
import { Route, useParams } from 'react-router-dom';

export type ClawRouterAdminRouteContribution = {
  path: string;
  owner: 'sdkwork-clawrouter' | 'sdkwork-models';
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

const DashboardAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-dashboard'), 'DashboardAdmin');
const AnalyticsAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-analytics'), 'AnalyticsAdmin');
const CacheAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-cache'), 'CacheAdmin');
const UpstreamAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-upstream'), 'UpstreamAdmin');
const ModelAdmin = lazyAdminRoute(() => import('@sdkwork/models-pc-admin-catalog'), 'ModelAdmin');
const ModelMappingAdmin = lazyAdminRoute(() => import('@sdkwork/models-pc-admin-catalog'), 'ModelMappingAdmin');
const ResourceAdmin = lazyAdminRoute(() => import('@sdkwork/models-pc-admin-resource'), 'ResourceAdmin');
const RecordAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-record'), 'RecordAdmin');
const MonitorAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-monitor'), 'MonitorAdmin');
const RateLimitAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-ratelimit'), 'RateLimitAdmin');
const ServiceNodesAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-service-nodes'), 'ServiceNodesAdmin');
const RuntimeRegionAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-runtime-region'), 'RuntimeRegionAdmin');
const ClawRouterAuthSettingsPage = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-site'), 'ClawRouterAuthSettingsPage');
const ClawRouterSiteSettingsPage = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-site'), 'ClawRouterSiteSettingsPage');
const MembershipsAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-memberships'), 'MembershipsAdmin');
const MarketingAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-marketing'), 'MarketingAdmin');
const PaymentsAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-payments'), 'PaymentsAdmin');
const StorageAdmin = lazyAdminRoute(() => import('@sdkwork/clawrouter-pc-admin-storage'), 'StorageAdmin');

export const CLAWROUTER_ADMIN_ROUTE_CONTRIBUTIONS: readonly ClawRouterAdminRouteContribution[] = [
  route('dashboard', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-dashboard', ['clawrouter-backend-sdk'], 'clawrouter.admin.access', <DashboardAdmin />),
  route('analytics', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-analytics', ['clawrouter-backend-sdk'], 'clawrouter.system.read', <AnalyticsAdmin />),
  route('upstream', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-upstream', ['clawrouter-backend-sdk'], 'clawrouter.admin.access', <UpstreamAdmin />),
  route('model', 'sdkwork-models', '@sdkwork/models-pc-admin-catalog', ['sdkwork-models-backend-sdk'], 'clawrouter.admin.access', <ModelAdmin />),
  route('model/resources', 'sdkwork-models', '@sdkwork/models-pc-admin-resource', ['sdkwork-models-backend-sdk'], 'clawrouter.admin.access', <ResourceAdmin />),
  route('model/mappings', 'sdkwork-models', '@sdkwork/models-pc-admin-catalog', ['sdkwork-models-backend-sdk'], 'clawrouter.admin.access', <ModelMappingAdmin />),
  route('record', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-record', ['clawrouter-backend-sdk'], 'clawrouter.system.read', <RecordAdmin />),
  route('monitor', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-monitor', ['clawrouter-backend-sdk'], 'clawrouter.system.read', <MonitorAdmin />),
  route('cache', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-cache', ['clawrouter-backend-sdk'], 'clawrouter.system.read', <CacheAdmin />),
  route('ratelimit', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-ratelimit', ['clawrouter-backend-sdk'], 'clawrouter.system.read', <RateLimitAdmin />),
  route('service-nodes', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-service-nodes', ['clawrouter-backend-sdk'], 'clawrouter.system.read', <ServiceNodesAdmin />),
  route('settings', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-site', ['clawrouter-backend-sdk'], 'clawrouter.admin.access', <ClawRouterAuthSettingsPage />),
  route('runtime-region', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-runtime-region', ['clawrouter-backend-sdk'], 'clawrouter.system.read', <RuntimeRegionAdmin />),
  route('site', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-site', ['clawrouter-backend-sdk'], 'clawrouter.admin.access', <ClawRouterSiteSettingsPage />),
  route('memberships/:sectionId?', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-memberships', ['sdkwork-membership-backend-sdk', 'clawrouter-backend-sdk'], 'clawrouter.admin.access', <AdminSectionRoute component={MembershipsAdmin} />),
  route('marketing/:sectionId?', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-marketing', ['sdkwork-promotion-backend-sdk', 'clawrouter-backend-sdk'], 'clawrouter.admin.access', <AdminSectionRoute component={MarketingAdmin} />),
  route('payments/:sectionId?', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-payments', ['sdkwork-payment-backend-sdk', 'clawrouter-backend-sdk'], 'clawrouter.admin.access', <AdminSectionRoute component={PaymentsAdmin} />),
  route('storage/:sectionId?', 'sdkwork-clawrouter', '@sdkwork/clawrouter-pc-admin-storage', ['clawrouter-backend-sdk'], 'clawrouter.admin.access', <AdminSectionRoute component={StorageAdmin} />),
];

function AdminSectionRoute({ component: Component }: { component: ComponentType<{ sectionId?: string }> }) {
  const { sectionId } = useParams<{ sectionId?: string }>();
  return <Component sectionId={sectionId} />;
}

function route(
  path: string,
  owner: ClawRouterAdminRouteContribution['owner'],
  adminPackage: ClawRouterAdminRouteContribution['adminPackage'],
  backendSdkFamilies: readonly string[],
  requiredPermission: string,
  element: ReactElement,
): ClawRouterAdminRouteContribution {
  return { path, owner, adminPackage, backendSdkFamilies, requiredPermission, element };
}

export function ClawRouterAdminHostRoutes(): ReactElement[] {
  return CLAWROUTER_ADMIN_ROUTE_CONTRIBUTIONS.map((contribution) => (
    <Route key={contribution.path} path={contribution.path} element={contribution.element} />
  ));
}
