import React, { useState, useLayoutEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppShellLayout, RouteFallback, ScrollToTop } from '@sdkwork/clawrouter-pc-shell';
import { ConsoleLayout } from '@sdkwork/clawrouter-pc-console-shell';
import { AdminLayout } from '@sdkwork/clawrouter-pc-admin-shell';
import {
  applyThemeColorPreference,
  applyThemePreference,
  persistThemePreference,
  persistThemeColorPreference,
  resolveEffectiveThemePreference,
  resolveInitialThemeColorPreference,
  resolveInitialThemePreference,
  type ResolvedThemePreference,
  type ThemeColorPreference,
  type ThemePreference,
} from './themePreference';
import { RequireAdminSession, RequirePortalSession, PortalAuthenticatedAuthRouteGuard } from './auth/protectedPortalRoutes';
import { SdkworkSessionAuthBrowserRoot } from '@sdkwork/auth-pc-react';
import { PortalErrorBoundary } from '@sdkwork/clawroutes-pc-commons';
import {
  SdkworkCommerceHostNavbarActions,
} from '@sdkwork/commerce-pc-host';
import { ClawRouterConsoleCommerceHostRoutes } from './commerce/commerceHostMount';

const Home = lazyRoute(() => import('@sdkwork/clawrouter-pc-home'), 'Home');
const Models = lazyRoute(() => import('@sdkwork/clawrouter-pc-models/models'), 'Models');
const ModelDetails = lazyRoute(() => import('@sdkwork/clawrouter-pc-models/details'), 'ModelDetails');
const Rankings = lazyRoute(() => import('@sdkwork/clawrouter-pc-rankings'), 'Rankings');
const Docs = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'Docs');
const ApiReference = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ApiReference');
const ProductDocs = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ProductDocs');
const SdkReference = lazyRoute(() => import('@sdkwork/documents-pc-sdk-reference'), 'SdkReference');
const Playground = lazyRoute(() => import('@sdkwork/clawrouter-pc-playground'), 'Playground');
const ClawRouterAuthRoutes = lazyRoute(() => import('./auth/ClawRouterAuthRoutes'), 'ClawRouterAuthRoutes');
const ClawRouterAuthSettingsPage = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-site'), 'ClawRouterAuthSettingsPage');

type AdminSectionRouteProps = {
  sectionId?: string;
  surface?: 'finance' | 'marketing';
};

const DashboardView = lazyRoute(() => import('@sdkwork/clawrouter-pc-console-dashboard'), 'DashboardView');
const UsageView = lazyRoute(() => import('@sdkwork/clawrouter-pc-console-usage'), 'UsageView');
const GatewayView = lazyRoute(() => import('@sdkwork/clawrouter-pc-console-gateway'), 'GatewayView');
const ApiKeysView = lazyRoute(() => import('@sdkwork/clawrouter-pc-console-api-keys'), 'ApiKeysView');
const UserView = lazyRoute(() => import('@sdkwork/clawrouter-pc-console-user'), 'UserView');
const SettingsView = lazyRoute(() => import('@sdkwork/clawrouter-pc-console-settings'), 'SettingsView');
const AccountView = lazyRoute(() => import('@sdkwork/commerce-pc-billing'), 'SdkworkBillingPage');
const SettlementsView = lazyRoute(() => import('@sdkwork/commerce-pc-billing'), 'SdkworkBillingPage');

const DashboardAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-dashboard'), 'DashboardAdmin');
const AnalyticsAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-analytics'), 'AnalyticsAdmin');
const CacheAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-cache'), 'CacheAdmin');
const UserAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-user'), 'UserAdmin');
const OrganizationAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-organization'), 'OrganizationAdmin');
const GroupAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-group'), 'GroupAdmin');
const ModelAdmin = lazyRoute(() => import('@sdkwork/models-pc-admin-catalog'), 'ModelAdmin');
const ModelMappingAdmin = lazyRoute(() => import('@sdkwork/models-pc-admin-catalog'), 'ModelMappingAdmin');
const ResourceAdmin = lazyRoute(() => import('@sdkwork/models-pc-admin-resource'), 'ResourceAdmin');
const SiteAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-relay-site'), 'SiteAdmin');
const PromptsAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-prompts'), 'PromptsAdmin');
const McpAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-mcp'), 'McpAdmin');
const ChannelAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-channel'), 'ChannelAdmin');
const OAuthAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-oauth'), 'OAuthAdmin');
const AnnouncementAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-announcement'), 'AnnouncementAdmin');
const CatalogAdmin = lazyRoute<AdminSectionRouteProps>(() => import('@sdkwork/clawrouter-pc-admin-catalog'), 'CatalogAdmin');
const InventoryAdmin = lazyRoute<AdminSectionRouteProps>(() => import('@sdkwork/clawrouter-pc-admin-inventory'), 'InventoryAdmin');
const OrdersAdmin = lazyRoute<AdminSectionRouteProps>(() => import('@sdkwork/clawrouter-pc-admin-orders'), 'OrdersAdmin');
const PaymentsAdmin = lazyRoute<AdminSectionRouteProps>(() => import('@sdkwork/clawrouter-pc-admin-payments'), 'PaymentsAdmin');
const WalletAdmin = lazyRoute<AdminSectionRouteProps>(() => import('@sdkwork/clawrouter-pc-admin-wallet'), 'WalletAdmin');
const FinanceAdmin = lazyRoute<AdminSectionRouteProps>(() => import('@sdkwork/clawrouter-pc-admin-finance'), 'FinanceAdmin');
const MarketingAdmin = lazyRoute<AdminSectionRouteProps>(() => import('@sdkwork/clawrouter-pc-admin-marketing'), 'MarketingAdmin');
const ServiceProviderAdmin = lazyRoute<AdminSectionRouteProps>(() => import('@sdkwork/clawrouter-pc-admin-service-provider'), 'ServiceProviderAdmin');
const RecordAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-record'), 'RecordAdmin');
const MonitorAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-monitor'), 'MonitorAdmin');
const RateLimitAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-ratelimit'), 'RateLimitAdmin');
const MessagingAdmin = lazyRoute(
  () => import('@sdkwork/clawrouter-pc-admin-messaging'),
  'MessagingAdmin',
); // apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-messaging
const ServiceNodesAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-service-nodes'), 'ServiceNodesAdmin');
const RuntimeRegionAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-runtime-region'), 'RuntimeRegionAdmin');
const ClawRouterSiteSettingsPage = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-site'), 'ClawRouterSiteSettingsPage');
const AgentsAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-agents'), 'AgentsAdmin');
const SkillAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-skill'), 'SkillAdmin');
const FilePlatformAdmin = lazyRoute<AdminSectionRouteProps>(
  () => import('@sdkwork/clawrouter-pc-admin-file-platform'),
  'FilePlatformAdmin',
);
const DriveAdmin = lazyRoute<AdminSectionRouteProps>(
  () => import('@sdkwork/clawrouter-pc-admin-file-platform'),
  'DriveAdmin',
);

function lazyRoute<TProps extends object = Record<string, unknown>>(
  loader: () => Promise<Record<string, unknown>>,
  exportName: string,
): React.LazyExoticComponent<React.ComponentType<TProps>> {
  return lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as React.ComponentType<TProps> };
  });
}

function MainLayout({ isDark, toggleTheme }: { isDark: boolean, toggleTheme: () => void }) {
  return (
    <AppShellLayout
      isDark={isDark}
      toggleTheme={toggleTheme}
      navbarAuthenticatedActionsStart={<SdkworkCommerceHostNavbarActions routePrefix="/console" />}
      Home={Home}
      Models={Models}
      ModelDetails={ModelDetails}
      Rankings={Rankings}
      Docs={Docs}
      ApiReference={ApiReference}
      ProductDocs={ProductDocs}
      SdkReference={SdkReference}
      Playground={Playground}
    />
  );
}

export default function App() {
  const { t } = useTranslation();
  const [theme, setThemeState] = useState<ThemePreference>(() => resolveInitialThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedThemePreference>(() => resolveEffectiveThemePreference(resolveInitialThemePreference()));
  const [themeColor, setThemeColorState] = useState<ThemeColorPreference>(() => resolveInitialThemeColorPreference());
  const isDark = resolvedTheme === 'dark';

  useLayoutEffect(() => {
    const syncTheme = () => {
      const nextResolvedTheme = applyThemePreference(theme);
      setResolvedTheme((currentTheme) => (currentTheme === nextResolvedTheme ? currentTheme : nextResolvedTheme));
    };

    syncTheme();
    persistThemePreference(theme);

    if (theme !== 'system' || typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) {
      return undefined;
    }

    mediaQuery.addEventListener('change', syncTheme);
    return () => {
      mediaQuery.removeEventListener('change', syncTheme);
    };
  }, [theme]);

  useLayoutEffect(() => {
    applyThemeColorPreference(themeColor);
    persistThemeColorPreference(themeColor);
  }, [themeColor]);

  const setTheme = (nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
  };

  const setThemeColor = (nextThemeColor: ThemeColorPreference) => {
    setThemeColorState(nextThemeColor);
  };

  const toggleTheme = () => {
    setThemeState((currentTheme) => {
      const currentResolvedTheme = resolveEffectiveThemePreference(currentTheme);
      return currentResolvedTheme === 'dark' ? 'light' : 'dark';
    });
  };

  return (
    <BrowserRouter>
      <SdkworkSessionAuthBrowserRoot
        copy={{
          businessCodeLabel: t('shared.sessionAuth.businessCodeLabel'),
          close: t('shared.sessionAuth.close'),
          codeLabel: t('shared.sessionAuth.codeLabel'),
          description: t('shared.sessionAuth.description'),
          detailsTitle: t('shared.sessionAuth.detailsTitle'),
          httpStatusLabel: t('shared.sessionAuth.httpStatusLabel'),
          login: t('shared.sessionAuth.login'),
          messageLabel: t('shared.sessionAuth.messageLabel'),
          pathLabel: t('shared.sessionAuth.pathLabel'),
          title: t('shared.sessionAuth.title'),
        }}
      >
      <ScrollToTop />
      <div className="min-h-screen flex flex-col selection:bg-lobster-500/30">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/auth/*" element={<PortalAuthenticatedAuthRouteGuard><ClawRouterAuthRoutes /></PortalAuthenticatedAuthRouteGuard>} />

            {/* Console Routes - standalone structure with global Navbar */}
            <Route path="/console" element={<PortalErrorBoundary><RequirePortalSession><ConsoleLayout isDark={isDark} toggleTheme={toggleTheme} theme={theme} setTheme={setTheme} themeColor={themeColor} setThemeColor={setThemeColor} navbarAuthenticatedActionsStart={<SdkworkCommerceHostNavbarActions routePrefix="/console" />} /></RequirePortalSession></PortalErrorBoundary>}>
              <Route index element={<Navigate to="/console/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardView />} />
              <Route path="usage" element={<UsageView />} />
              <Route path="gateway" element={<GatewayView />} />
              <Route path="api-keys" element={<ApiKeysView />} />
              <Route path="account" element={<AccountView />} />
              {ClawRouterConsoleCommerceHostRoutes()}
              <Route path="settlements" element={<SettlementsView />} />
              <Route path="user" element={<UserView />} />
              <Route path="settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/console/dashboard" replace />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<PortalErrorBoundary><RequireAdminSession><AdminLayout isDark={isDark} toggleTheme={toggleTheme} /></RequireAdminSession></PortalErrorBoundary>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardAdmin />} />
              <Route path="analytics" element={<AnalyticsAdmin />} />
              <Route path="user" element={<UserAdmin />} />
              <Route path="organization" element={<OrganizationAdmin />} />
              <Route path="group" element={<GroupAdmin />} />
              <Route path="model" element={<ModelAdmin />} />
              <Route path="model/resources" element={<ResourceAdmin />} />
              <Route path="model/sites" element={<SiteAdmin />} />
              <Route path="model/mappings" element={<ModelMappingAdmin />} />
              <Route path="prompts" element={<PromptsAdmin />} />
              <Route path="mcp" element={<McpAdmin />} />
              <Route path="agents" element={<AgentsAdmin />} />
              <Route path="skill" element={<SkillAdmin />} />
              <Route path="channel" element={<ChannelAdmin />} />
              <Route path="oauth" element={<Navigate to="/admin/oauth/login-platforms" replace />} />
              <Route path="oauth/login-platforms" element={<OAuthAdmin sectionId="oauthLoginPlatforms" />} />
              <Route path="oauth/official-accounts" element={<OAuthAdmin sectionId="officialAccounts" />} />
              <Route path="oauth/mini-programs" element={<OAuthAdmin sectionId="miniPrograms" />} />
              <Route path="announcement" element={<AnnouncementAdmin />} />
              <Route path="catalog" element={<Navigate to="/admin/catalog/products" replace />} />
              <Route path="catalog/categories" element={<CatalogAdmin sectionId="categories" />} />
              <Route path="catalog/products/new" element={<CatalogAdmin sectionId="productCreate" />} />
              <Route path="catalog/products/:productId/edit" element={<CatalogAdmin sectionId="productEdit" />} />
              <Route path="catalog/products" element={<CatalogAdmin sectionId="products" />} />
              <Route path="catalog/skus" element={<CatalogAdmin sectionId="skus" />} />
              <Route path="catalog/attributes" element={<CatalogAdmin sectionId="attributes" />} />
              <Route path="catalog/prices" element={<CatalogAdmin sectionId="prices" />} />
              <Route path="inventory" element={<Navigate to="/admin/inventory/stocks" replace />} />
              <Route path="inventory/stocks" element={<InventoryAdmin sectionId="stocks" />} />
              <Route path="inventory/reservations" element={<InventoryAdmin sectionId="reservations" />} />
              <Route path="inventory/ledger" element={<InventoryAdmin sectionId="ledger" />} />
              <Route path="orders" element={<Navigate to="/admin/orders/orders" replace />} />
              <Route path="orders/orders" element={<OrdersAdmin sectionId="orders" />} />
              <Route path="orders/refunds" element={<OrdersAdmin sectionId="refunds" />} />
              <Route path="orders/fulfillments" element={<OrdersAdmin sectionId="fulfillments" />} />
              <Route path="orders/shipments" element={<OrdersAdmin sectionId="shipments" />} />
              <Route path="payments" element={<Navigate to="/admin/payments/provider-accounts" replace />} />
              <Route path="payments/providers" element={<PaymentsAdmin sectionId="providers" />} />
              <Route path="payments/provider-accounts" element={<PaymentsAdmin sectionId="providerAccounts" />} />
              <Route path="payments/methods" element={<PaymentsAdmin sectionId="methods" />} />
              <Route path="payments/channels" element={<PaymentsAdmin sectionId="channels" />} />
              <Route path="payments/route-rules" element={<PaymentsAdmin sectionId="routeRules" />} />
              <Route path="payments/intents" element={<PaymentsAdmin sectionId="intents" />} />
              <Route path="payments/attempts" element={<PaymentsAdmin sectionId="attempts" />} />
              <Route path="payments/webhook-events" element={<PaymentsAdmin sectionId="webhookEvents" />} />
              <Route path="payments/reconciliation-runs" element={<PaymentsAdmin sectionId="reconciliationRuns" />} />
              <Route path="memberships/*" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="wallet" element={<Navigate to="/admin/wallet/wallet-accounts" replace />} />
              <Route path="wallet/recharge-orders" element={<WalletAdmin sectionId="rechargeOrders" />} />
              <Route path="wallet/wallet-accounts" element={<WalletAdmin sectionId="walletAccounts" />} />
              <Route path="wallet/wallet-ledger" element={<WalletAdmin sectionId="walletLedger" />} />
              <Route path="wallet/exchange-rules" element={<WalletAdmin sectionId="exchangeRules" />} />
              <Route path="finance" element={<Navigate to="/admin/finance/order-revenue" replace />} />
              <Route path="finance/invoice-titles" element={<FinanceAdmin sectionId="invoiceTitles" />} />
              <Route path="finance/invoices" element={<FinanceAdmin sectionId="invoices" />} />
              <Route path="finance/payment-reconciliation" element={<FinanceAdmin sectionId="paymentReconciliationReport" />} />
              <Route path="finance/order-revenue" element={<FinanceAdmin sectionId="orderRevenueReport" />} />
              <Route path="finance/refunds-report" element={<FinanceAdmin sectionId="refundsReport" />} />
              <Route path="finance/audit-events" element={<FinanceAdmin sectionId="auditEvents" />} />
              <Route path="marketing" element={<MarketingAdmin />} />
              <Route path="marketing/offers" element={<MarketingAdmin sectionId="promotionOffers" />} />
              <Route path="marketing/promotion-coupon-stocks" element={<MarketingAdmin sectionId="promotionCouponStocks" />} />
              <Route path="marketing/promotion-codes" element={<MarketingAdmin sectionId="promotionCodes" />} />
              <Route path="marketing/promotion-code-redemptions" element={<MarketingAdmin sectionId="promotionCodeRedemptions" />} />
              <Route path="marketing/user-coupons" element={<MarketingAdmin sectionId="userCoupons" />} />
              <Route path="marketing/discount-applications" element={<MarketingAdmin sectionId="discountApplications" />} />
              <Route path="marketing/discount-allocations" element={<MarketingAdmin sectionId="discountAllocations" />} />
              <Route path="marketing/promotion-coupon-ledger" element={<MarketingAdmin sectionId="promotionCouponLedger" />} />
              <Route path="marketing/budget-ledger" element={<MarketingAdmin sectionId="budgetLedger" />} />
              <Route path="marketing/external-bindings" element={<MarketingAdmin sectionId="externalBindings" />} />
              <Route path="marketing/events" element={<MarketingAdmin sectionId="promotionEvents" />} />
              <Route path="marketing/referrals" element={<MarketingAdmin sectionId="referrals" />} />
              <Route path="service-providers" element={<Navigate to="/admin/service-providers/dashboard" replace />} />
              <Route path="service-providers/dashboard" element={<ServiceProviderAdmin sectionId="dashboard" />} />
              <Route path="service-providers/providers" element={<ServiceProviderAdmin sectionId="providers" />} />
              <Route path="service-providers/relations" element={<ServiceProviderAdmin sectionId="relations" />} />
              <Route path="service-providers/downstreams" element={<ServiceProviderAdmin sectionId="downstreams" />} />
              <Route path="service-providers/members" element={<ServiceProviderAdmin sectionId="members" />} />
              <Route path="service-providers/bindings" element={<ServiceProviderAdmin sectionId="bindings" />} />
              <Route path="service-providers/contracts" element={<ServiceProviderAdmin sectionId="contracts" />} />
              <Route path="service-providers/pricing" element={<ServiceProviderAdmin sectionId="pricing" />} />
              <Route path="service-providers/usage" element={<ServiceProviderAdmin sectionId="usage" />} />
              <Route path="service-providers/wallet" element={<ServiceProviderAdmin sectionId="wallet" />} />
              <Route path="service-providers/statements" element={<ServiceProviderAdmin sectionId="statements" />} />
              <Route path="service-providers/reconciliation" element={<ServiceProviderAdmin sectionId="reconciliation" />} />
              <Route path="service-providers/adjustments" element={<ServiceProviderAdmin sectionId="adjustments" />} />
              <Route path="service-providers/risk" element={<ServiceProviderAdmin sectionId="risk" />} />
              <Route path="service-providers/audit" element={<ServiceProviderAdmin sectionId="audit" />} />
              <Route path="record" element={<RecordAdmin />} />
              <Route path="monitor" element={<MonitorAdmin />} />
              <Route path="cache" element={<CacheAdmin />} />
              <Route path="messaging" element={<Navigate to="/admin/messaging/providers" replace />} />
              <Route path="messaging/providers" element={<MessagingAdmin sectionId="providers" />} />
              <Route path="messaging/sender-identities" element={<MessagingAdmin sectionId="sender-identities" />} />
              <Route path="messaging/templates" element={<MessagingAdmin sectionId="templates" />} />
              <Route path="messaging/route-rules" element={<MessagingAdmin sectionId="route-rules" />} />
              <Route path="messaging/send-requests" element={<MessagingAdmin sectionId="send-requests" />} />
              <Route path="messaging/diagnostics" element={<MessagingAdmin sectionId="diagnostics" />} />
              <Route path="messaging/suppressions" element={<MessagingAdmin sectionId="suppressions" />} />
              <Route path="messaging/rate-limits" element={<MessagingAdmin sectionId="rate-limits" />} />
              <Route path="messaging/verification-policies" element={<MessagingAdmin sectionId="verification-policies" />} />
              <Route path="ratelimit" element={<RateLimitAdmin />} />
              <Route path="service-nodes" element={<ServiceNodesAdmin />} />
              <Route path="storage" element={<Navigate to="/admin/storage/providers" replace />} />
              <Route path="storage/providers" element={<FilePlatformAdmin sectionId="providers" />} />
              <Route path="storage/buckets" element={<FilePlatformAdmin sectionId="buckets" />} />
              <Route path="storage/default-buckets" element={<FilePlatformAdmin sectionId="default-buckets" />} />
              <Route path="storage/quotas" element={<FilePlatformAdmin sectionId="quotas" />} />
              <Route path="storage/usage" element={<FilePlatformAdmin sectionId="usage" />} />
              <Route path="storage/reconciliation" element={<FilePlatformAdmin sectionId="reconciliation" />} />
              <Route path="storage/garbage-collection" element={<FilePlatformAdmin sectionId="garbage-collection" />} />
              <Route path="drive" element={<Navigate to="/admin/drive/spaces" replace />} />
              <Route path="drive/spaces" element={<DriveAdmin sectionId="spaces" />} />
              <Route path="drive/nodes" element={<DriveAdmin sectionId="nodes" />} />
              <Route path="drive/permissions" element={<DriveAdmin sectionId="permissions" />} />
              <Route path="drive/share-links" element={<DriveAdmin sectionId="share-links" />} />
              <Route path="drive/audit" element={<DriveAdmin sectionId="audit" />} />
              <Route path="settings" element={<ClawRouterAuthSettingsPage />} />
              <Route path="runtime-region" element={<RuntimeRegionAdmin />} />
              <Route path="site" element={<ClawRouterSiteSettingsPage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>

            <Route path="*" element={<MainLayout isDark={isDark} toggleTheme={toggleTheme} />} />
          </Routes>
        </Suspense>
      </div>
      </SdkworkSessionAuthBrowserRoot>
    </BrowserRouter>
  );
}
