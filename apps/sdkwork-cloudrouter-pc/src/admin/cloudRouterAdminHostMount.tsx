import { lazy, useEffect, useMemo, useState, type ComponentType, type LazyExoticComponent, type ReactElement } from 'react';
import { Navigate, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { DomainCenterAdminProps, DomainCenterSectionId } from '@sdkwork/cloudrouter-pc-admin-domain';
import { IAM_ADMIN_ROUTE_RECORDS } from '@sdkwork/cloudrouter-pc-admin-iam/contribution';
import { RTC_ADMIN_ROUTE_RECORDS } from '@sdkwork/cloudrouter-pc-admin-rtc/contribution';
import { RTC_ADMIN_ROUTE_ELEMENTS } from '@sdkwork/cloudrouter-pc-admin-rtc';
import { TRADE_ADMIN_ROUTE_RECORDS } from '@sdkwork/order-pc-admin-trade/contribution';
import { MESSAGING_ADMIN_ROUTE_RECORDS } from '@sdkwork/messaging-pc-admin-notify/contribution';
import { HARDWARE_ADMIN_ROUTE_RECORDS } from '@sdkwork/cloudrouter-pc-admin-hardware/contribution';
import { PRODUCT_CENTER_ADMIN_ROUTE_RECORDS } from '@sdkwork/cloudrouter-pc-admin-product/contribution';
import { ENTERPRISE_ADMIN_ROUTE_RECORDS } from '@sdkwork/company-pc-admin-enterprise/contribution';
import { TradeCenterHostElement } from './tradeCenterHostElement.tsx';
import { EnterpriseCenterHostElement } from './enterpriseCenterHostElement.tsx';
import { DocumentsAdminRuntimeProvider } from '@sdkwork/documents-pc-admin-documents';
import { createCloudRouterDocumentsAdminClient } from '@sdkwork/cloudroutes-pc-commons';

export type CloudRouterAdminRouteContribution = {
  path: string;
  owner: 'sdkwork-cloudrouter' | 'sdkwork-models' | 'sdkwork-log' | 'sdkwork-partner' | 'sdkwork-rtc' | 'sdkwork-order' | 'sdkwork-messaging' | 'sdkwork-course' | 'sdkwork-skills' | 'sdkwork-mcp' | 'sdkwork-agents' | 'sdkwork-plugins' | 'sdkwork-documents' | 'sdkwork-memory'| 'sdkwork-aiot' | 'sdkwork-shop' | 'sdkwork-inventory' | 'sdkwork-company';
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
/**
 * Data Center screens. The module is a standalone data platform with its own
 * backend; until that backend and SDK land, each page renders an explicit
 * "backend not provisioned" state from the package's client port instead of
 * fabricated data. No other admin module is read, migrated or redirected.
 */
const DataCenterOverviewAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-data'), 'DataCenterOverviewPage');
const DataCenterSourcesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-data'), 'DataCenterSourcesPage');
const DataCenterTablesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-data'), 'DataCenterTablesPage');
const DataCenterExportsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-data'), 'DataCenterExportsPage');
const DataCenterAuditsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-data'), 'DataCenterAuditsPage');
const CacheAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-cache'), 'CacheAdmin');
const UpstreamSupplierAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-upstream'), 'UpstreamSupplierAdmin');
const UpstreamAccountAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-upstream'), 'UpstreamAccountAdmin');
const UpstreamAccountGroupAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-upstream'), 'UpstreamAccountGroupAdmin');
const ModelAdmin = lazyAdminRoute(() => import('@sdkwork/models-pc-admin-catalog'), 'ModelAdmin');
const ModelMappingAdmin = lazyAdminRoute(() => import('@sdkwork/models-pc-admin-catalog'), 'ModelMappingAdmin');
const FrontendModelAdmin = lazyAdminRoute(() => import('@sdkwork/models-pc-admin-catalog'), 'FrontendModelAdmin');
const ResourceAdmin = lazyAdminRoute(() => import('@sdkwork/models-pc-admin-resource'), 'ResourceAdmin');
const SkillsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-skill'), 'SkillsAdminPage');
const SkillCategoriesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-skill'), 'SkillCategoriesAdminPage');
const McpServersAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-connector'), 'McpServersAdminPage');
const McpServerDetailAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-connector'), 'McpServerDetailAdminPage');
const McpCategoriesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-connector'), 'McpCategoriesAdminPage');
const AgentsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-agent'), 'AgentsAdminPage');
const AgentCategoriesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-agent'), 'AgentCategoriesAdminPage');
const PluginsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-plugin'), 'PluginsAdminPage');
const PluginCategoriesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-plugin'), 'PluginCategoriesAdminPage');
const MemoryAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-memory'), 'MemoryAdminPage');
const MemoryCategoriesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-memory'), 'MemoryCategoriesAdminPage');
const RecordAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-record'), 'RecordAdmin');
const RequestLogAdmin = lazyAdminRoute(() => import('@sdkwork/log-pc-admin-request-log'), 'RequestLogAdmin');
const MonitorAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-monitor'), 'MonitorAdmin');
const RateLimitAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-ratelimit'), 'RateLimitAdmin');
const ServiceNodesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-service-nodes'), 'ServiceNodesAdmin');
const RuntimeRegionAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-runtime-region'), 'RuntimeRegionAdmin');
const CloudRouterAuthSettingsPage = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-site'), 'CloudRouterAuthSettingsPage');
const CloudRouterSiteSettingsPage = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-site'), 'CloudRouterSiteSettingsPage') as LazyExoticComponent<ComponentType<{ bundledDownloadCatalog?: unknown }>>;
const MembershipsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-memberships'), 'MembershipsAdmin');
const RechargeAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-memberships'), 'RechargeAdmin');
const PricePlansAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-pricing'), 'PricePlansAdmin');
const RateCardsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-pricing'), 'RateCardsAdmin');
const PricingRulesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-pricing'), 'PricingRulesAdmin');
const PriceSettingsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-pricing'), 'PriceSettingsAdmin');
const CommunityAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-community'), 'CommunityAdmin');
const CourseAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-course'), 'CourseAdmin');
const MarketingAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-marketing'), 'MarketingAdmin');
const PartnerAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-partner'), 'CloudRouterPartnerAdmin');
const PaymentsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-payments'), 'PaymentsAdmin');
const StorageAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-storage'), 'StorageAdmin') as LazyExoticComponent<ComponentType<{
  sectionId?: string;
  onSectionChange?: (sectionId: string) => void;
}>>;
/**
 * Domain Center screens. The deployments domain control plane answers every
 * page; the host only lazily loads the UI and turns its section navigation into
 * a real route change so deep links and the browser back button keep working.
 */
const DomainCenterAdmin = lazyAdminRoute(
  () => import('@sdkwork/cloudrouter-pc-admin-domain'),
  'DomainCenterAdmin',
) as LazyExoticComponent<ComponentType<DomainCenterAdminProps>>;
const IamUsersAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamUsersAdmin');
const IamTenantsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamTenantsAdmin');
const IamOrganizationsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOrganizationsAdmin');
const IamOrganizationStructureAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOrganizationStructureAdmin');
const IamInstallationsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'CloudRouterInstallationsPage');
const IamOrganizationApplicationsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'CloudRouterOrganizationApplicationsPage');
const ApplicationCenterAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'CloudRouterApplicationCenterPage');
const AppCenterOverviewAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'AppCenterOverviewPage');
const AppCenterAnalyticsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'AppCenterAnalyticsPage');
const ApplicationScaffoldManagementAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'ApplicationScaffoldManagementPage');
const ApplicationScaffoldCategoryAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'ApplicationScaffoldCategoryPage');
const ScaffoldReviewQueueAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'ScaffoldReviewQueuePage');
const AppModerationAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'AppModerationPage');
const AppAppealsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'AppAppealsPage');
const AppPublishersAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'AppPublishersPage');
const AppFeaturedAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'AppFeaturedPage');
const AppCollectionsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'AppCollectionsPage');
const AppListingsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-application'), 'AppListingsPage');
const IamRolesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamRolesAdmin');
const IamPermissionsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamPermissionsAdmin');
const IamPoliciesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamPoliciesAdmin');
const IamAuthorizationsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamAuthorizationsAdmin');
const IamOauthAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthAdmin');
const IamOauthRelyingPartyAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthRelyingPartyAdmin');
const IamOauthProviderConnectionsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthProviderConnectionsAdmin');
const IamOauthMiniProgramsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthMiniProgramsAdmin');
const IamOauthOperatorPlatformsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthOperatorPlatformsAdmin');
const IamOauthAuthorizedAccountsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthAuthorizedAccountsAdmin');
const IamOauthChannelReleasesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthChannelReleasesAdmin');
const IamOauthOfficialAccountsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthOfficialAccountsAdmin');
const IamOauthOfficialAccountCustomMenuAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthOfficialAccountCustomMenuAdmin');
const IamOauthScanLoginAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthScanLoginAdmin');
const IamOauthLoginFollowQrAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamOauthLoginFollowQrAdmin');
const IamAccountBindingAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamAccountBindingAdmin');
const IamAuditAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-iam'), 'CloudRouterIamAuditAdmin');
const MessagingNotifyOverview = lazyAdminRoute(() => import('@sdkwork/messaging-pc-admin-notify'), 'NotificationDashboardPage');
const MessagingNotifyEmailChannel = lazyAdminRoute(() => import('@sdkwork/messaging-pc-admin-notify'), 'EmailChannelPage');
const MessagingNotifySmsChannel = lazyAdminRoute(() => import('@sdkwork/messaging-pc-admin-notify'), 'SmsChannelPage');
const MessagingNotifyEmailRecords = lazyAdminRoute(() => import('@sdkwork/messaging-pc-admin-notify'), 'EmailSendRecordsPage');
const MessagingNotifySmsRecords = lazyAdminRoute(() => import('@sdkwork/messaging-pc-admin-notify'), 'SmsSendRecordsPage');
const MessagingNotifyEmailTemplates = lazyAdminRoute(() => import('@sdkwork/messaging-pc-admin-notify'), 'EmailTemplatesPage');
const MessagingNotifySmsTemplates = lazyAdminRoute(() => import('@sdkwork/messaging-pc-admin-notify'), 'SmsTemplatesPage');
const DocumentsAdminList = lazyAdminRoute(() => import('@sdkwork/documents-pc-admin-documents'), 'DocumentCenterPage');const DocumentsAdminEditor = lazyAdminRoute(
  () => import('@sdkwork/documents-pc-admin-documents'),
  'DocumentEditorPage',
) as LazyExoticComponent<ComponentType<{ documentId?: string }>>;

/**
 * Smart Hardware Center screens. The AIoT management backend answers every one
 * of these pages; the host only lazily loads the UI blocks and injects the
 * AIoT backend SDK client at startup (see `hardwareSdkHostWiring.ts`).
 */
const HardwareOverviewAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareOverviewPage');
const HardwareProductsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareProductsPage');
const HardwareProfilesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareProfilesPage');
const HardwareProtocolProfilesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareProtocolProfilesPage');
const HardwareCapabilityModelsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareCapabilityModelsPage');
const HardwareDevicesAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareDevicesPage');
const HardwareDeviceDetailAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareDeviceDetailPage');
const HardwareDeviceSettingsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareDeviceSettingsPage');
const HardwareFirmwareArtifactsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareFirmwareArtifactsPage');
const HardwareFirmwareRolloutsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareFirmwareRolloutsPage');
const HardwareEventsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareEventsPage');
const HardwareProtocolAdaptersAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareProtocolAdaptersPage');
const HardwareRuntimeAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-hardware'), 'HardwareRuntimePage');

/**
 * Product Center screens.
 *
 * The catalog, inventory, and order modules answer these pages through their
 * generated backend SDKs; the host only lazy-loads the UI blocks. The screens
 * are deliberately separate routes (not one `:sectionId` switch) so a deep link
 * to a stock ledger or a shipment queue survives a refresh.
 */
const ProductCenterOverviewAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'ProductCenterOverviewPage') as LazyExoticComponent<ComponentType<{ onNavigate?: (path: string) => void }>>;
const ProductListAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'ProductListPage') as LazyExoticComponent<ComponentType<{ onOpenProduct?: (productId: string) => void }>>;
const ProductDetailAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'ProductDetailPage') as LazyExoticComponent<ComponentType<{ productId: string; onBack?: () => void }>>;
const ProductPriceListsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'PriceListPage');
const ProductSkuListAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'SkuListPage');
const ProductBrandListAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'BrandListPage');
const ProductCategoryListAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'CategoryListPage');
const ProductCategoryTreeAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'CategoryTreePage');
const ProductAttributeListAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'AttributeListPage');
const ProductStockListAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'StockListPage');
const ProductMovementListAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'MovementListPage');
const ProductReservationListAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'ReservationListPage');
const ProductShipmentListAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'ShipmentListPage');
const ProductLogisticsAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'LogisticsTrackingPage');
const ProductCarrierListAdmin = lazyAdminRoute(() => import('@sdkwork/cloudrouter-pc-admin-product'), 'CarrierListPage');

/** Screen key to element, mirroring `PRODUCT_CENTER_ADMIN_ROUTE_RECORDS[].screen`. */
const PRODUCT_CENTER_ADMIN_ROUTE_ELEMENTS: Readonly<Record<string, ReactElement>> = {
  overview: <ProductOverviewHostRoute />,
  products: <ProductListHostRoute />,
  'product-detail': <ProductDetailHostRoute />,
  skus: <ProductSkuListAdmin />,
  brands: <ProductBrandListAdmin />,
  categories: <ProductCategoryListAdmin />,
  'category-tree': <ProductCategoryTreeAdmin />,
  attributes: <ProductAttributeListAdmin />,
  'price-lists': <ProductPriceListsAdmin />,
  stocks: <ProductStockListAdmin />,
  movements: <ProductMovementListAdmin />,
  reservations: <ProductReservationListAdmin />,
  shipments: <ProductShipmentListAdmin />,
  logistics: <ProductLogisticsAdmin />,
  carriers: <ProductCarrierListAdmin />,
};

/**
 * Product Center host navigation.
 *
 * The package owns no router dependency, so the host projects SPA navigation
 * into the two interactions that need it: opening a product detail route from
 * the list, and returning from that detail page.
 */
function ProductOverviewHostRoute() {
  const navigate = useNavigate();
  return <ProductCenterOverviewAdmin onNavigate={(path) => navigate(path)} />;
}

function ProductListHostRoute() {
  const navigate = useNavigate();
  return <ProductListAdmin onOpenProduct={(productId) => navigate(`/admin/products/${productId}`)} />;
}

function ProductDetailHostRoute() {
  const { productId } = useParams<{ productId?: string }>();
  const navigate = useNavigate();
  if (!productId) {
    return <Navigate replace to="/admin/products/list" />;
  }
  return <ProductDetailAdmin onBack={() => navigate('/admin/products/list')} productId={productId} />;
}

const PRODUCT_CENTER_SCREEN_OWNER: Readonly<Record<string, {
  owner: CloudRouterAdminRouteContribution['owner'];
  backendSdkFamilies: readonly string[];
}>> = {
  overview: { owner: 'sdkwork-shop', backendSdkFamilies: ['shop-backend-sdk', 'inventory-backend-sdk', 'order-backend-sdk'] },
  products: { owner: 'sdkwork-shop', backendSdkFamilies: ['shop-backend-sdk'] },
  'product-detail': { owner: 'sdkwork-shop', backendSdkFamilies: ['shop-backend-sdk'] },
  skus: { owner: 'sdkwork-shop', backendSdkFamilies: ['shop-backend-sdk'] },
  brands: { owner: 'sdkwork-shop', backendSdkFamilies: ['shop-backend-sdk'] },
  categories: { owner: 'sdkwork-shop', backendSdkFamilies: ['shop-backend-sdk'] },
  'category-tree': { owner: 'sdkwork-shop', backendSdkFamilies: ['shop-backend-sdk'] },
  attributes: { owner: 'sdkwork-shop', backendSdkFamilies: ['shop-backend-sdk'] },
  'price-lists': { owner: 'sdkwork-shop', backendSdkFamilies: ['shop-backend-sdk'] },
  stocks: { owner: 'sdkwork-inventory', backendSdkFamilies: ['inventory-backend-sdk'] },
  movements: { owner: 'sdkwork-inventory', backendSdkFamilies: ['inventory-backend-sdk'] },
  reservations: { owner: 'sdkwork-inventory', backendSdkFamilies: ['inventory-backend-sdk'] },
  shipments: { owner: 'sdkwork-order', backendSdkFamilies: ['order-backend-sdk'] },
  logistics: { owner: 'sdkwork-order', backendSdkFamilies: ['order-backend-sdk'] },
  carriers: { owner: 'sdkwork-order', backendSdkFamilies: ['order-backend-sdk'] },
};

/** Screen key to element, mirroring `HARDWARE_ADMIN_ROUTE_RECORDS[].screen`. */
const HARDWARE_ADMIN_ROUTE_ELEMENTS: Readonly<Record<string, ReactElement>> = {
  'overview': <HardwareOverviewAdmin />,
  'products': <HardwareProductsAdmin />,
  'hardware-profiles': <HardwareProfilesAdmin />,
  'protocol-profiles': <HardwareProtocolProfilesAdmin />,
  'capability-models': <HardwareCapabilityModelsAdmin />,
  'devices': <HardwareDevicesAdmin />,
  'device-detail': <HardwareDeviceDetailAdmin />,
  'device-settings': <HardwareDeviceSettingsAdmin />,
  'firmware-artifacts': <HardwareFirmwareArtifactsAdmin />,
  'firmware-rollouts': <HardwareFirmwareRolloutsAdmin />,
  'events': <HardwareEventsAdmin />,
  'protocol-adapters': <HardwareProtocolAdaptersAdmin />,
  'runtime': <HardwareRuntimeAdmin />,
};

/**
 * Lazy route elements for the IAM admin module; paths mirror
 * @sdkwork/cloudrouter-pc-admin-iam IAM_ADMIN_ROUTE_RECORDS. The bare `iam`
 * record is a redirect handled by `IAM_ADMIN_ROUTE_RECORDS[].redirectTo`.
 */
const IAM_ADMIN_ROUTE_ELEMENTS: Readonly<Record<string, ReactElement>> = {
  'iam/users': <IamUsersAdmin />,
  'iam/tenants': <IamTenantsAdmin />,
  'iam/tenants/:tenantId/applications': <IamInstallationsAdmin />,
  'iam/organizations': <IamOrganizationsAdmin />,
  'iam/organizations/:organizationId/structure': <IamOrganizationStructureAdmin />,
  'iam/organizations/:organizationId/applications': <IamOrganizationApplicationsAdmin />,
  'iam/roles': <IamRolesAdmin />,
  'iam/permissions': <IamPermissionsAdmin />,
  'iam/policies': <IamPoliciesAdmin />,
  'iam/authorizations': <IamAuthorizationsAdmin />,
  'iam/oauth': <IamOauthAdmin />,
  'iam/oauth/relying-party': <IamOauthRelyingPartyAdmin />,
  'iam/oauth/providers': <IamOauthProviderConnectionsAdmin />,
  'iam/oauth/mini-programs': <IamOauthMiniProgramsAdmin />,
  'iam/oauth/operator-platforms': <IamOauthOperatorPlatformsAdmin />,
  'iam/oauth/authorized-accounts': <IamOauthAuthorizedAccountsAdmin />,
  'iam/oauth/channel-releases': <IamOauthChannelReleasesAdmin />,
  'iam/oauth/official-accounts': <IamOauthOfficialAccountsAdmin />,
  'iam/oauth/official-accounts/:resourceAccountId/custom-menus': <IamOauthOfficialAccountCustomMenuAdmin />,
  'iam/oauth/scan-login': <IamOauthScanLoginAdmin />,
  'iam/oauth/login-follow-qr': <IamOauthLoginFollowQrAdmin />,
  'iam/account-binding': <IamAccountBindingAdmin />,
  'iam/audit': <IamAuditAdmin />,
};

/**
 * Lazy route elements for the messaging notify admin module; paths mirror
 * `@sdkwork/messaging-pc-admin-notify` MESSAGING_ADMIN_ROUTE_RECORDS screens.
 */
const MESSAGING_ADMIN_ROUTE_ELEMENTS: Readonly<Record<string, ReactElement>> = {
  overview: <MessagingNotifyOverview />,
  'email-channel': <MessagingNotifyEmailChannel />,
  'sms-channel': <MessagingNotifySmsChannel />,
  'email-records': <MessagingNotifyEmailRecords />,
  'sms-records': <MessagingNotifySmsRecords />,
  'email-templates': <MessagingNotifyEmailTemplates />,
  'sms-templates': <MessagingNotifySmsTemplates />,
};

/**
 * The site settings page needs one cross-surface handoff the console package may not own: the
 * application's bundled download catalog, which seeds the structured download editor when
 * nothing is published yet. The home package is imported dynamically so the admin graph keeps
 * its own code split instead of eagerly pulling in the landing surface.
 */
function SiteSettingsRoute() {
  const [bundledDownloadCatalog, setBundledDownloadCatalog] = useState<unknown>(undefined);
  useEffect(() => {
    let active = true;
    void import('@sdkwork/cloudrouter-pc-home').then((module) => {
      if (active) {
        setBundledDownloadCatalog(module.cloudRouterDownloadCatalog);
      }
    }).catch(() => {
      // Without the seed the editor falls back to a minimal skeleton; the page still works.
    });
    return () => {
      active = false;
    };
  }, []);
  return <CloudRouterSiteSettingsPage bundledDownloadCatalog={bundledDownloadCatalog} />;
}

export const CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS: readonly CloudRouterAdminRouteContribution[] = [
  route('dashboard', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-dashboard', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <DashboardAdmin />),
  route('data', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-data', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <Navigate to="/admin/data/overview" replace />),
  route('data/overview', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-data', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <DataCenterOverviewAdmin />),
  route('data/sources', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-data', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <DataCenterSourcesAdmin />),
  route('data/tables', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-data', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <DataCenterTablesAdmin />),
  route('data/exports', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-data', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <DataCenterExportsAdmin />),
  route('data/audits', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-data', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <DataCenterAuditsAdmin />),
  // Application Center: one tenant-wide application factory. The overview is
  // the module landing page; the per-source catalog views, App Store category
  // governance, and the template library are separate routes so the admin shell
  // sidebar is the single left menu. The wildcard keeps one catalog instance
  // mounted while its view changes.
  route('applications', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-iam-backend-sdk', 'sdkwork-deployments-app-sdk', 'sdkwork-appstore-app-sdk', 'sdkwork-appstore-backend-sdk'], 'cloudrouter.admin.access', <AppCenterOverviewAdmin />),
  // The operator URL named in the refactor request renders the scaffold
  // library directly, and the scaffold-vocabulary URLs remain canonical for
  // links and the shell menu. Both paths resolve to the same surface.
  route('applications/templates', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-deployments-app-sdk'], 'cloudrouter.admin.access', <ApplicationScaffoldManagementAdmin />),
  route('applications/template-reviews', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-deployments-app-sdk', 'sdkwork-deployments-backend-sdk'], 'cloudrouter.admin.access', <ScaffoldReviewQueueAdmin />),
  route('applications/template-categories', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-deployments-app-sdk'], 'cloudrouter.admin.access', <ApplicationScaffoldCategoryAdmin />),
  route('applications/scaffolds', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-deployments-app-sdk'], 'cloudrouter.admin.access', <ApplicationScaffoldManagementAdmin />),
  route('applications/scaffold-reviews', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-deployments-app-sdk', 'sdkwork-deployments-backend-sdk'], 'cloudrouter.admin.access', <ScaffoldReviewQueueAdmin />),
  route('applications/scaffold-categories', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-deployments-app-sdk'], 'cloudrouter.admin.access', <ApplicationScaffoldCategoryAdmin />),
  route('applications/moderation', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-appstore-backend-sdk'], 'cloudrouter.admin.access', <AppModerationAdmin />),
  route('applications/appeals', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-appstore-backend-sdk'], 'cloudrouter.admin.access', <AppAppealsAdmin />),
  route('applications/publishers', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-appstore-backend-sdk'], 'cloudrouter.admin.access', <AppPublishersAdmin />),
  route('applications/featured', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-appstore-backend-sdk'], 'cloudrouter.admin.access', <AppFeaturedAdmin />),
  route('applications/collections', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-appstore-backend-sdk'], 'cloudrouter.admin.access', <AppCollectionsAdmin />),
  route('applications/listings', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-appstore-backend-sdk'], 'cloudrouter.admin.access', <AppListingsAdmin />),
  route('applications/analytics', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-deployments-app-sdk', 'sdkwork-deployments-backend-sdk', 'sdkwork-appstore-backend-sdk'], 'cloudrouter.admin.access', <AppCenterAnalyticsAdmin />),
  route('applications/*', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-application', ['sdkwork-iam-backend-sdk', 'sdkwork-deployments-app-sdk', 'sdkwork-appstore-app-sdk', 'sdkwork-appstore-backend-sdk'], 'cloudrouter.admin.access', <ApplicationCenterAdmin />),
  route('analytics', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-analytics', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <AnalyticsAdmin />),
  route('upstream', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-upstream', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <Navigate to="/admin/upstream/suppliers" replace />),
  route('upstream/suppliers', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-upstream', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <UpstreamSupplierAdmin />),
  route('upstream/accounts', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-upstream', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <UpstreamAccountAdmin />),
  route('upstream/account-groups', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-upstream', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <UpstreamAccountGroupAdmin />),
  route('model', 'sdkwork-models', '@sdkwork/models-pc-admin-catalog', ['sdkwork-models-backend-sdk'], 'cloudrouter.admin.access', <ModelAdmin />),
  route('model/resources', 'sdkwork-models', '@sdkwork/models-pc-admin-resource', ['sdkwork-models-backend-sdk'], 'cloudrouter.admin.access', <ResourceAdmin />),
  route('model/mappings', 'sdkwork-models', '@sdkwork/models-pc-admin-catalog', ['sdkwork-models-backend-sdk'], 'cloudrouter.admin.access', <ModelMappingAdmin />),
  route('model/frontend', 'sdkwork-models', '@sdkwork/models-pc-admin-catalog', ['sdkwork-models-backend-sdk'], 'cloudrouter.admin.access', <FrontendModelAdmin />),
  route('skill/categories', 'sdkwork-skills', '@sdkwork/cloudrouter-pc-admin-skill', ['sdkwork-skills-backend-sdk'], 'cloudrouter.admin.access', <SkillCategoriesAdmin />),
  route('skill', 'sdkwork-skills', '@sdkwork/cloudrouter-pc-admin-skill', ['sdkwork-skills-backend-sdk'], 'cloudrouter.admin.access', <SkillsAdmin />),
  route('connector/categories', 'sdkwork-mcp', '@sdkwork/cloudrouter-pc-admin-connector', ['sdkwork-mcp-backend-sdk'], 'cloudrouter.admin.access', <McpCategoriesAdmin />),
  route('connector/:serverKey', 'sdkwork-mcp', '@sdkwork/cloudrouter-pc-admin-connector', ['sdkwork-mcp-backend-sdk'], 'cloudrouter.admin.access', <McpServerDetailAdmin />),
  route('connector', 'sdkwork-mcp', '@sdkwork/cloudrouter-pc-admin-connector', ['sdkwork-mcp-backend-sdk'], 'cloudrouter.admin.access', <McpServersAdmin />),
  route('plugin/categories', 'sdkwork-plugins', '@sdkwork/cloudrouter-pc-admin-plugin', ['sdkwork-plugins-backend-sdk'], 'cloudrouter.admin.access', <PluginCategoriesAdmin />),
  route('plugin', 'sdkwork-plugins', '@sdkwork/cloudrouter-pc-admin-plugin', ['sdkwork-plugins-backend-sdk'], 'cloudrouter.admin.access', <PluginsAdmin />),
  route('agent/categories', 'sdkwork-agents', '@sdkwork/cloudrouter-pc-admin-agent', ['sdkwork-agents-backend-sdk'], 'cloudrouter.admin.access', <AgentCategoriesAdmin />),
  route('agent', 'sdkwork-agents', '@sdkwork/cloudrouter-pc-admin-agent', ['sdkwork-agents-backend-sdk'], 'cloudrouter.admin.access', <AgentsAdmin />),
  route('memory/categories', 'sdkwork-memory', '@sdkwork/cloudrouter-pc-admin-memory', ['sdkwork-memory-backend-sdk'], 'cloudrouter.admin.access', <MemoryCategoriesAdmin />),
  route('memory', 'sdkwork-memory', '@sdkwork/cloudrouter-pc-admin-memory', ['sdkwork-memory-backend-sdk'], 'cloudrouter.admin.access', <MemoryAdmin />),
  route('record', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-record', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <RecordAdmin />),
  route('request-log', 'sdkwork-log', '@sdkwork/log-pc-admin-request-log', ['sdkwork-log-backend-sdk'], 'cloudrouter.system.read', <RequestLogAdmin />),
  route('monitor', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-monitor', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <MonitorAdmin />),
  route('cache', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-cache', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <CacheAdmin />),
  route('ratelimit', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-ratelimit', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <RateLimitAdmin />),
  route('service-nodes', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-service-nodes', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <ServiceNodesAdmin />),
  route('settings', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-site', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <CloudRouterAuthSettingsPage />),
  route('runtime-region', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-runtime-region', ['cloudrouter-backend-sdk'], 'cloudrouter.system.read', <RuntimeRegionAdmin />),
  route('site', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-site', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <SiteSettingsRoute />),
  route('memberships/:sectionId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-memberships', ['sdkwork-membership-backend-sdk', 'cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={MembershipsAdmin} />),
  route('community/:sectionId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-community', ['sdkwork-community-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={CommunityAdmin} />),
  route('course/:sectionId?', 'sdkwork-course', '@sdkwork/cloudrouter-pc-admin-course', ['sdkwork-course-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={CourseAdmin} />),
  route('recharges/:sectionId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-memberships', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={RechargeAdmin} />),
  route('pricing', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-pricing', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <Navigate to="/admin/pricing/settings" replace />),
  route('pricing/settings/:sectionId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-pricing', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <PricingSectionRoute />),
  route('pricing/plans', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-pricing', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <Navigate to="/admin/pricing/settings/plans" replace />),
  route('pricing/rateCards', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-pricing', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <Navigate to="/admin/pricing/settings/rateCards" replace />),
  route('pricing/rules', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-pricing', ['cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <Navigate to="/admin/pricing/settings/rules" replace />),
  route('marketing/:sectionId?/:batchId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-marketing', ['sdkwork-promotion-backend-sdk', 'cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminMarketingRoute component={MarketingAdmin} />),
  route('partner/:sectionId?', 'sdkwork-partner', '@sdkwork/cloudrouter-pc-admin-partner', ['sdkwork-partner-backend-sdk', 'cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={PartnerAdmin} />),
  route('payments/:sectionId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-payments', ['sdkwork-payment-backend-sdk', 'cloudrouter-backend-sdk'], 'cloudrouter.admin.access', <AdminSectionRoute component={PaymentsAdmin} />),
  route('storage/:sectionId?', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-storage', ['cloudrouter-backend-sdk', 'sdkwork-drive-admin-storage-sdk', 'drive-backend-sdk'], 'cloudrouter.admin.access', <StorageAdminRoute />),
  // Domain Center: one module, six operator surfaces. Every operation is owned
  // by the deployments domain control plane (`sdkwork-deployments-app-sdk`), so
  // the admin surface can never drift from what the deployment engine enforces.
  route('domains', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-domain', ['sdkwork-deployments-app-sdk'], 'cloudrouter.admin.access', <DomainCenterRoute sectionId="overview" />),
  route('domains/zones', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-domain', ['sdkwork-deployments-app-sdk'], 'cloudrouter.admin.access', <DomainCenterRoute sectionId="zones" />),
  route('domains/hostnames', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-domain', ['sdkwork-deployments-app-sdk'], 'cloudrouter.admin.access', <DomainCenterRoute sectionId="hostnames" />),
  route('domains/dns', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-domain', ['sdkwork-deployments-app-sdk'], 'cloudrouter.admin.access', <DomainCenterRoute sectionId="dns" />),
  route('domains/certificates', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-domain', ['sdkwork-deployments-app-sdk'], 'cloudrouter.admin.access', <DomainCenterRoute sectionId="certificates" />),
  route('domains/accounts', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-domain', ['sdkwork-deployments-app-sdk'], 'cloudrouter.admin.access', <DomainCenterRoute sectionId="accounts" />),
  // Document Center: pages and rich-text editor are owned by sdkwork-documents;
  // the portal supplies the generated documents app client through the port.
  route('documents', 'sdkwork-documents', '@sdkwork/documents-pc-admin-documents', ['sdkwork-documents-app-sdk'], 'cloudrouter.admin.access', <DocumentsAdminHostRoute />),
  route('documents/new', 'sdkwork-documents', '@sdkwork/documents-pc-admin-documents', ['sdkwork-documents-app-sdk'], 'cloudrouter.admin.access', <DocumentsAdminEditorHostRoute />),
  route('documents/:documentId', 'sdkwork-documents', '@sdkwork/documents-pc-admin-documents', ['sdkwork-documents-app-sdk'], 'cloudrouter.admin.access', <DocumentsAdminEditorHostRoute />),
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
  ...ENTERPRISE_ADMIN_ROUTE_RECORDS.map((record) =>
    route(
      record.path,
      'sdkwork-company',
      '@sdkwork/company-pc-admin-enterprise',
      ['sdkwork-company-backend-sdk'],
      record.requiredPermission,
      record.redirectTo
        ? <Navigate to={record.redirectTo} replace />
        : <EnterpriseCenterHostElement />,
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
  ...HARDWARE_ADMIN_ROUTE_RECORDS.map((record) =>
    route(
      record.path,
      'sdkwork-aiot',
      '@sdkwork/cloudrouter-pc-admin-hardware',
      ['aiot-backend-sdk'],
      record.requiredPermission,
      record.redirectTo
        ? <Navigate to={record.redirectTo} replace />
        : HARDWARE_ADMIN_ROUTE_ELEMENTS[record.screen]!,
    ),
  ),
  // Product Center: one header module over three owning-module backend SDKs.
  // Each record declares the module that actually answers it so a dependency
  // audit can trace a screen back to `shop`/`inventory`/`order` without reading
  // the page implementation.
  ...PRODUCT_CENTER_ADMIN_ROUTE_RECORDS.map((record) => {
    const meta = PRODUCT_CENTER_SCREEN_OWNER[record.screen];
    return route(
      record.path,
      meta?.owner ?? 'sdkwork-shop',
      '@sdkwork/cloudrouter-pc-admin-product',
      meta?.backendSdkFamilies ?? ['shop-backend-sdk'],
      record.requiredPermission,
      record.redirectTo
        ? <Navigate to={record.redirectTo} replace />
        : PRODUCT_CENTER_ADMIN_ROUTE_ELEMENTS[record.screen]!,
    );
  }),
];

function AdminSectionRoute({ component: Component }: { component: ComponentType<{ sectionId?: string }> }) {
  const { sectionId } = useParams<{ sectionId?: string }>();
  return <Component sectionId={sectionId} />;
}

/**
 * Storage center host route.
 *
 * Unlike the other `:sectionId` admins, the storage center hands operators from
 * space governance to file governance. That handoff is a real route change
 * (`/admin/storage/spaces` -> `/admin/storage/files`) so the browser back button
 * and deep links keep working; the section navigation callback is injected here
 * because the package must not depend on `react-router-dom` itself.
 */
function StorageAdminRoute() {
  const { sectionId } = useParams<{ sectionId?: string }>();
  const navigate = useNavigate();
  return (
    <StorageAdmin
      sectionId={sectionId}
      onSectionChange={(nextSectionId) => navigate(`/admin/storage/${nextSectionId}`)}
    />
  );
}

/**
 * Domain Center host route.
 *
 * The zone selected on the overview or in the zone table travels in the `zone`
 * query string, so `/admin/domains/hostnames?zone=<id>` is a shareable deep link
 * and a refresh keeps the operator on the same root domain. Section navigation
 * is a route change, not internal state, for the same reason.
 */
function DomainCenterRoute({ sectionId }: { sectionId: DomainCenterSectionId }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const zoneId = searchParams.get('zone') ?? undefined;
  return (
    <DomainCenterAdmin
      sectionId={sectionId}
      initialZoneId={zoneId}
      onSectionChange={(nextSection, nextZoneId) => {
        const path = nextSection === 'overview' ? '/admin/domains' : `/admin/domains/${nextSection}`;
        const query = nextZoneId ? `?zone=${encodeURIComponent(nextZoneId)}` : '';
        navigate(`${path}${query}`);
      }}
    />
  );
}

function useDocumentsAdminRuntimeValue() {
  return useMemo(
    () => ({
      client: createCloudRouterDocumentsAdminClient(),
      basePath: '/admin/documents',
    }),
    [],
  );
}

function DocumentsAdminHostRoute() {
  const runtime = useDocumentsAdminRuntimeValue();
  return (
    <DocumentsAdminRuntimeProvider value={runtime}>
      <DocumentsAdminList />
    </DocumentsAdminRuntimeProvider>
  );
}

function DocumentsAdminEditorHostRoute() {
  const runtime = useDocumentsAdminRuntimeValue();
  const { documentId } = useParams<{ documentId?: string }>();
  return (
    <DocumentsAdminRuntimeProvider value={runtime}>
      <DocumentsAdminEditor documentId={documentId} />
    </DocumentsAdminRuntimeProvider>
  );
}

function AdminMarketingRoute({ component: Component }: { component: ComponentType<{ sectionId?: string; batchId?: string }> }) {
  const { sectionId, batchId } = useParams<{ sectionId?: string; batchId?: string }>();
  return <Component sectionId={sectionId} batchId={batchId} />;
}

/**
 * Pricing keeps a single sidebar entry (`/admin/pricing/settings`), so plan,
 * rate-card and rule management are sections of that one surface: their routes
 * live under the settings path, and the legacy `/admin/pricing/{plans,rateCards,rules}`
 * links redirect into the matching section. An absent or unknown section falls
 * back to the settings page, matching `AdminSectionRoute`'s behavior of letting
 * the route resolve to its default view.
 */
const PRICING_SECTION_COMPONENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  plans: PricePlansAdmin,
  rateCards: RateCardsAdmin,
  rules: PricingRulesAdmin,
};

function PricingSectionRoute() {
  const { sectionId } = useParams<{ sectionId?: string }>();
  const Section: LazyExoticComponent<ComponentType> | undefined = sectionId
    ? PRICING_SECTION_COMPONENTS[sectionId]
    : undefined;
  return Section ? <Section /> : <PriceSettingsAdmin />;
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
