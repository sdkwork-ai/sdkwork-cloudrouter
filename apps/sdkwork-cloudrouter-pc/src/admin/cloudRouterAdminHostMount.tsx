import { lazy, type ComponentType, type LazyExoticComponent, type ReactElement } from 'react';
import { Navigate, Route, useParams } from 'react-router-dom';
import { IAM_ADMIN_ROUTE_RECORDS } from '@sdkwork/cloudrouter-pc-admin-iam/contribution';
import { RTC_ADMIN_ROUTE_RECORDS } from '@sdkwork/cloudrouter-pc-admin-rtc/contribution';
import { RTC_ADMIN_ROUTE_ELEMENTS } from '@sdkwork/cloudrouter-pc-admin-rtc';
import { TRADE_ADMIN_ROUTE_RECORDS } from '@sdkwork/order-pc-admin-trade/contribution';
import { MESSAGING_ADMIN_ROUTE_RECORDS } from '@sdkwork/messaging-pc-admin-notify/contribution';
import { TradeCenterHostElement } from './tradeCenterHostElement.tsx';

export type CloudRouterAdminRouteContribution = {
  path: string;
  owner: 'sdkwork-cloudrouter' | 'sdkwork-models' | 'sdkwork-log' | 'sdkwork-partner' | 'sdkwork-rtc' | 'sdkwork-order' | 'sdkwork-messaging';
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
const RequestLogAdmin = lazyAdminRoute(() => import('@sdkwork/log-pc-admin-request-log'), 'RequestLogAdmin');
const MonitorAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-monitor'), 'MonitorAdmin');
const RateLimitAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-ratelimit'), 'RateLimitAdmin');
const ServiceNodesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-service-nodes'), 'ServiceNodesAdmin');
const RuntimeRegionAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-runtime-region'), 'RuntimeRegionAdmin');
const CloudRouterAuthSettingsPage = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-site'), 'CloudRouterAuthSettingsPage');
const CloudRouterSiteSettingsPage = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-site'), 'CloudRouterSiteSettingsPage');
const MembershipsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-memberships'), 'MembershipsAdmin');
const RechargeAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-memberships'), 'RechargeAdmin');
const PricePlansAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-pricing'), 'PricePlansAdmin');
const RateCardsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-pricing'), 'RateCardsAdmin');
const PricingRulesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-pricing'), 'PricingRulesAdmin');
const PriceSettingsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-pricing'), 'PriceSettingsAdmin');
const CommunityAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-community'), 'CommunityAdmin');
const MarketingAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-marketing'), 'MarketingAdmin');
const PartnerAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-partner'), 'CloudRouterPartnerAdmin');
const PaymentsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-payments'), 'PaymentsAdmin');
const StorageAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-storage'), 'StorageAdmin');
const IamUsersAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamUsersAdmin');
const IamTenantsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamTenantsAdmin');
const IamApplicationsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamApplicationsAdmin');
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
const IamOauthOfficialAccountCustomMenuAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthOfficialAccountCustomMenuAdmin');
const IamOauthScanLoginAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthScanLoginAdmin');
const IamAccountBindingAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamAccountBindingAdmin');
const IamAuditAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamAuditAdmin');
const MessagingNotifyEmailChannel = lazyAdminRoute(() => import('@sdkwork/messaging-pc-admin-notify'), 'EmailChannelPage');
const MessagingNotifySmsChannel = lazyAdminRoute(() => import('@sdkwork/messaging-pc-admin-notify'), 'SmsChannelPage');
const MessagingNotifyEmailTemplates = lazyAdminRoute(() => import('@sdkwork/messaging-pc-admin-notify'), 'EmailTemplatesPage');
const MessagingNotifySmsTemplates = lazyAdminRoute(() => import('@sdkwork/messaging-pc-admin-notify'), 'SmsTemplatesPage');

/**
 * Lazy route elements for the IAM admin module; paths mirror
 * @sdkwork/cloudrouter-pc-admin-iam IAM_ADMIN_ROUTE_RECORDS. The bare `iam`
 * record is a redirect handled by `IAM_ADMIN_ROUTE_RECORDS[].redirectTo`.
 */
const IAM_ADMIN_ROUTE_ELEMENTS: Readonly<Record<string, ReactElement>> = {
  'iam/users': <IamUsersAdmin />,
  'iam/tenants': <IamTenantsAdmin />,
  'iam/applications': <IamApplicationsAdmin />,
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
  'iam/oauth/official-accounts/:resourceAccountId/custom-menus': <IamOauthOfficialAccountCustomMenuAdmin />,
  'iam/oauth/scan-login': <IamOauthScanLoginAdmin />,
  'iam/account-binding': <IamAccountBindingAdmin />,
  'iam/audit': <IamAuditAdmin />,
};

/**
 * Lazy route elements for the messaging notify admin module; paths mirror
 * `@sdkwork/messaging-pc-admin-notify` MESSAGING_ADMIN_ROUTE_RECORDS screens.
 */
const MESSAGING_ADMIN_ROUTE_ELEMENTS: Readonly<Record<string, ReactElement>> = {
  'email-channel': <MessagingNotifyEmailChannel />,
  'sms-channel': <MessagingNotifySmsChannel />,
  'email-templates': <MessagingNotifyEmailTemplates />,
  'sms-templates': <MessagingNotifySmsTemplates />,
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
  route('request-log', 'sdkwork-log', '@sdkwork/log-pc-admin-request-log', ['sdkwork-log-backend-sdk'], 'cloudrouter.system.read', <RequestLogAdmin />),
  route('monitor', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-monitor', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <MonitorAdmin />),
  route('cache', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-cache', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <CacheAdmin />),
  route('ratelimit', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-ratelimit', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <RateLimitAdmin />),
  route('service-nodes', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-service-nodes', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <ServiceNodesAdmin />),
  route('settings', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-site', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <CloudRouterAuthSettingsPage />),
  route('runtime-region', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-runtime-region', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <RuntimeRegionAdmin />),
  route('site', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-site', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <CloudRouterSiteSettingsPage />),
  route('memberships/:sectionId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-memberships', ['sdkwork-membership-backend-sdk', 'cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={MembershipsAdmin} />),
  route('community/:sectionId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-community', ['sdkwork-community-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={CommunityAdmin} />),
  route('recharges/:sectionId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-memberships', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={RechargeAdmin} />),
  route('pricing', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-pricing', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <Navigate to="/admin/pricing/settings" replace />),
  route('pricing/settings', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-pricing', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <PriceSettingsAdmin />),
  route('pricing/plans', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-pricing', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <PricePlansAdmin />),
  route('pricing/rateCards', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-pricing', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <RateCardsAdmin />),
  route('pricing/rules', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-pricing', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <PricingRulesAdmin />),
  route('marketing/:sectionId?/:batchId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-marketing', ['sdkwork-promotion-backend-sdk', 'cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminMarketingRoute component={MarketingAdmin} />),
  route('partner/:sectionId?', 'sdkwork-partner', '@sdkwork/cloudrouter-pc-admin-partner', ['sdkwork-partner-backend-sdk', 'cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={PartnerAdmin} />),
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
  ...RTC_ADMIN_ROUTE_RECORDS.map((record) =>
    route(
      record.path,
      'sdkwork-rtc',
      '@sdkwork/cloudrouter-pc-admin-rtc',
      ['sdkwork-rtc-backend-sdk'],
      record.requiredPermission,
      record.redirectTo
        ? <Navigate to={record.redirectTo} replace />
        : RTC_ADMIN_ROUTE_ELEMENTS[record.path]!,
    ),
  ),
  ...TRADE_ADMIN_ROUTE_RECORDS.map((record) =>
    route(
      record.path,
      'sdkwork-order',
      '@sdkwork/order-pc-admin-trade',
      ['sdkwork-order-backend-sdk'],
      record.requiredPermission,
      record.redirectTo
        ? <Navigate to={record.redirectTo} replace />
        : <TradeCenterHostElement />,
    ),
  ),
  ...MESSAGING_ADMIN_ROUTE_RECORDS.map((record) =>
    route(
      record.path,
      'sdkwork-messaging',
      '@sdkwork/messaging-pc-admin-notify',
      ['sdkwork-messaging-backend-sdk'],
      record.requiredPermission,
      record.redirectTo
        ? <Navigate to={record.redirectTo} replace />
        : MESSAGING_ADMIN_ROUTE_ELEMENTS[record.screen]!,
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
