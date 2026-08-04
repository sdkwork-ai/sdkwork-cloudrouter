import React, { useState, useLayoutEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppShellLayout, RouteFallback, ScrollToTop } from '@sdkwork/cloudrouter-pc-shell';
import { ConsoleLayout } from '@sdkwork/cloudrouter-pc-console-shell';
import { AdminLayout } from '@sdkwork/cloudrouter-pc-admin-shell';
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
import { PortalErrorBoundary } from '@sdkwork/cloudroutes-pc-commons';
import { CloudRouterConsoleBusinessHostRoutes } from './console-business/consoleBusinessHostMount';
import { CloudRouterConsoleBusinessNavbarActions } from './console-business/consoleBusinessNavbar';
import { applySdkCommerceThemeVariables } from './console-business/consoleCommerceTheme';
import { CloudRouterAdminHostRoutes } from './admin/cloudRouterAdminHostMount';

const Home = lazyRoute(() => import('@sdkwork/cloudrouter-pc-home'), 'Home');
const Models = lazyRoute(() => import('@sdkwork/cloudrouter-pc-models/models'), 'Models');
const ModelDetails = lazyRoute(() => import('@sdkwork/cloudrouter-pc-models/details'), 'ModelDetails');
const Rankings = lazyRoute(() => import('@sdkwork/cloudrouter-pc-rankings'), 'Rankings');
const Docs = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'Docs');
const ApiReference = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ApiReference');
const ProductDocs = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ProductDocs');
const SdkReference = lazyRoute(() => import('@sdkwork/documents-pc-sdk-reference'), 'SdkReference');
const Playground = lazyRoute(() => import('@sdkwork/cloudrouter-pc-playground'), 'Playground');
const CloudRouterTokenPlanPage = lazyRoute(() => import('./token-plan/CloudRouterTokenPlanPage'), 'CloudRouterTokenPlanPage');
const CloudRouterAuthRoutes = lazyRoute(() => import('./auth/CloudRouterAuthRoutes'), 'CloudRouterAuthRoutes');

const DashboardView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-dashboard'), 'DashboardView');
const UsageView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-usage'), 'UsageView');
const GatewayView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-gateway'), 'GatewayView');
const ApiKeysView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-api-keys'), 'ApiKeysView');
const MessagesView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-messages'), 'MessagesView');
const UserView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-user'), 'UserView');
const SettingsView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-settings'), 'SettingsView');
const AccountView = lazyRoute(() => import('./console-business/ConsoleAccountView'), 'ConsoleAccountView');
const SettlementsView = lazyRoute(() => import('./console-business/ConsoleSettlementsView'), 'ConsoleSettlementsView');

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
      navbarAuthenticatedActionsStart={<CloudRouterConsoleBusinessNavbarActions isDark={isDark} routePrefix="/console" />}
      Home={Home}
      Models={Models}
      ModelDetails={ModelDetails}
      Rankings={Rankings}
      Docs={Docs}
      ApiReference={ApiReference}
      ProductDocs={ProductDocs}
      SdkReference={SdkReference}
      Playground={Playground}
      TokenPlan={CloudRouterTokenPlanPage}
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
          close: t('shared.sessionAuth.close'),
        }}
      >
      <ScrollToTop />
      <div className="min-h-screen flex flex-col selection:bg-lobster-500/30">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/auth/*" element={<PortalAuthenticatedAuthRouteGuard><CloudRouterAuthRoutes /></PortalAuthenticatedAuthRouteGuard>} />

            {/* Console Routes - standalone structure with global Navbar */}
            <Route path="/console" element={<PortalErrorBoundary><RequirePortalSession><ConsoleLayout isDark={isDark} toggleTheme={toggleTheme} theme={theme} setTheme={setTheme} themeColor={themeColor} setThemeColor={setThemeColor} navbarAuthenticatedActionsStart={<CloudRouterConsoleBusinessNavbarActions isDark={isDark} routePrefix="/console" />} /></RequirePortalSession></PortalErrorBoundary>}>
              <Route index element={<Navigate to="/console/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardView />} />
              <Route path="usage" element={<UsageView />} />
              <Route path="gateway" element={<GatewayView />} />
              <Route path="api-keys" element={<ApiKeysView />} />
              <Route path="account" element={<AccountView />} />
              {CloudRouterConsoleBusinessHostRoutes()}
              <Route path="settlements" element={<SettlementsView />} />
              <Route path="notifications" element={<MessagesView />} />
              <Route path="user" element={<UserView />} />
              <Route path="settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/console/dashboard" replace />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<PortalErrorBoundary><RequireAdminSession><AdminLayout isDark={isDark} toggleTheme={toggleTheme} /></RequireAdminSession></PortalErrorBoundary>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              {CloudRouterAdminHostRoutes()}
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
