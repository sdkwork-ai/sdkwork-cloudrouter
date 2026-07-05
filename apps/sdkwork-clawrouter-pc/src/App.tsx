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
import { ClawRouterConsoleBusinessHostRoutes } from './console-business/consoleBusinessHostMount';
import { ClawRouterConsoleBusinessNavbarActions } from './console-business/consoleBusinessNavbar';
import { applySdkCommerceThemeVariables } from './console-business/consoleCommerceTheme';

const Home = lazyRoute(() => import('@sdkwork/clawrouter-pc-home'), 'Home');
const Models = lazyRoute(() => import('@sdkwork/clawrouter-pc-models/models'), 'Models');
const ModelDetails = lazyRoute(() => import('@sdkwork/clawrouter-pc-models/details'), 'ModelDetails');
const Rankings = lazyRoute(() => import('@sdkwork/clawrouter-pc-rankings'), 'Rankings');
const Docs = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'Docs');
const ApiReference = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ApiReference');
const ProductDocs = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ProductDocs');
const SdkReference = lazyRoute(() => import('@sdkwork/documents-pc-sdk-reference'), 'SdkReference');
const Playground = lazyRoute(() => import('@sdkwork/clawrouter-pc-playground'), 'Playground');
const ClawRouterTokenPlanPage = lazyRoute(() => import('./token-plan/ClawRouterTokenPlanPage'), 'ClawRouterTokenPlanPage');
const ClawRouterAuthRoutes = lazyRoute(() => import('./auth/ClawRouterAuthRoutes'), 'ClawRouterAuthRoutes');
const ClawRouterAuthSettingsPage = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-site'), 'ClawRouterAuthSettingsPage');

const DashboardView = lazyRoute(() => import('@sdkwork/clawrouter-pc-console-dashboard'), 'DashboardView');
const UsageView = lazyRoute(() => import('@sdkwork/clawrouter-pc-console-usage'), 'UsageView');
const GatewayView = lazyRoute(() => import('@sdkwork/clawrouter-pc-console-gateway'), 'GatewayView');
const ApiKeysView = lazyRoute(() => import('@sdkwork/clawrouter-pc-console-api-keys'), 'ApiKeysView');
const UserView = lazyRoute(() => import('@sdkwork/clawrouter-pc-console-user'), 'UserView');
const SettingsView = lazyRoute(() => import('@sdkwork/clawrouter-pc-console-settings'), 'SettingsView');
const AccountView = lazyRoute(() => import('./console-business/ConsoleAccountView'), 'ConsoleAccountView');
const SettlementsView = lazyRoute(() => import('./console-business/ConsoleSettlementsView'), 'ConsoleSettlementsView');

const DashboardAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-dashboard'), 'DashboardAdmin');
const AnalyticsAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-analytics'), 'AnalyticsAdmin');
const CacheAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-cache'), 'CacheAdmin');
const GroupAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-group'), 'GroupAdmin');
const ModelAdmin = lazyRoute(() => import('@sdkwork/models-pc-admin-catalog'), 'ModelAdmin');
const ModelMappingAdmin = lazyRoute(() => import('@sdkwork/models-pc-admin-catalog'), 'ModelMappingAdmin');
const ResourceAdmin = lazyRoute(() => import('@sdkwork/models-pc-admin-resource'), 'ResourceAdmin');
const SiteAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-relay-site'), 'SiteAdmin');
const ChannelAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-channel'), 'ChannelAdmin');
const RecordAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-record'), 'RecordAdmin');
const MonitorAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-monitor'), 'MonitorAdmin');
const RateLimitAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-ratelimit'), 'RateLimitAdmin');
const ServiceNodesAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-service-nodes'), 'ServiceNodesAdmin');
const RuntimeRegionAdmin = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-runtime-region'), 'RuntimeRegionAdmin');
const ClawRouterSiteSettingsPage = lazyRoute(() => import('@sdkwork/clawrouter-pc-admin-site'), 'ClawRouterSiteSettingsPage');

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
      navbarAuthenticatedActionsStart={<ClawRouterConsoleBusinessNavbarActions isDark={isDark} routePrefix="/console" />}
      Home={Home}
      Models={Models}
      ModelDetails={ModelDetails}
      Rankings={Rankings}
      Docs={Docs}
      ApiReference={ApiReference}
      ProductDocs={ProductDocs}
      SdkReference={SdkReference}
      Playground={Playground}
      TokenPlan={ClawRouterTokenPlanPage}
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

  useLayoutEffect(() => {
    applySdkCommerceThemeVariables(isDark, themeColor);
  }, [isDark, themeColor]);

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
            <Route path="/console" element={<PortalErrorBoundary><RequirePortalSession><ConsoleLayout isDark={isDark} toggleTheme={toggleTheme} theme={theme} setTheme={setTheme} themeColor={themeColor} setThemeColor={setThemeColor} navbarAuthenticatedActionsStart={<ClawRouterConsoleBusinessNavbarActions isDark={isDark} routePrefix="/console" />} /></RequirePortalSession></PortalErrorBoundary>}>
              <Route index element={<Navigate to="/console/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardView />} />
              <Route path="usage" element={<UsageView />} />
              <Route path="gateway" element={<GatewayView />} />
              <Route path="api-keys" element={<ApiKeysView />} />
              <Route path="account" element={<AccountView />} />
              {ClawRouterConsoleBusinessHostRoutes()}
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
              <Route path="group" element={<GroupAdmin />} />
              <Route path="model" element={<ModelAdmin />} />
              <Route path="model/resources" element={<ResourceAdmin />} />
              <Route path="model/sites" element={<SiteAdmin />} />
              <Route path="model/mappings" element={<ModelMappingAdmin />} />
              <Route path="channel" element={<ChannelAdmin />} />
              <Route path="record" element={<RecordAdmin />} />
              <Route path="monitor" element={<MonitorAdmin />} />
              <Route path="cache" element={<CacheAdmin />} />
              <Route path="ratelimit" element={<RateLimitAdmin />} />
              <Route path="service-nodes" element={<ServiceNodesAdmin />} />
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
