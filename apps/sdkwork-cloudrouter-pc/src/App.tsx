import React, { useState, useLayoutEffect, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import { createCloudRouterPublicDocumentsClient } from '@sdkwork/cloudroutes-pc-commons';
import { PublicDocumentsRuntimeProvider } from '@sdkwork/documents-pc-public-documents/runtime';
import { CloudRouterConsoleBusinessHostRoutes } from './console-business/consoleBusinessHostMount';
import { CloudRouterConsoleIamOauthMenuRoute } from './console-business/consoleIamOauthMenuHost';
import { CloudRouterConsoleBusinessNavbarActions } from './console-business/consoleBusinessNavbar';
import { applySdkCommerceThemeVariables } from './console-business/consoleCommerceTheme';
import { CloudRouterAdminHostRoutes } from './admin/cloudRouterAdminHostMount';
import { LEGAL_DOCUMENT_PATHS } from '@sdkwork/documents-pc-legal/paths';

const Home = lazyRoute(() => import('@sdkwork/cloudrouter-pc-home'), 'Home');
const Models = lazyRoute(() => import('@sdkwork/cloudrouter-pc-models/models'), 'Models');
const ModelDetails = lazyRoute(() => import('@sdkwork/cloudrouter-pc-models/details'), 'ModelDetails');
const Rankings = lazyRoute(() => import('@sdkwork/cloudrouter-pc-rankings'), 'Rankings');
const Pricing = lazyRoute(() => import('@sdkwork/cloudrouter-pc-pricing'), 'PricingPage');
const Docs = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'Docs');
const ApiReference = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ApiReference');
const ProductDocs = lazyRoute(() => import('@sdkwork/documents-pc-api-reference'), 'ProductDocs');
const SdkReference = lazyRoute(() => import('@sdkwork/documents-pc-sdk-reference'), 'SdkReference');
// Public document center: /docs resolves published documents by slug or id and
// is served by the shared sdkwork-documents reader.
const PublicDocumentIndex = lazyRoute(
  () => import('@sdkwork/documents-pc-public-documents'),
  'PublicDocumentIndexPage',
);
const PublicDocumentReader = lazyRoute(
  () => import('@sdkwork/documents-pc-public-documents'),
  'PublicDocumentPage',
);
// Legal policy pages are owned by sdkwork-documents: the document bodies and
// their renderer ship in `@sdkwork/documents-pc-legal`, so the portal mounts
// the shared pages instead of duplicating legal copy per application.
const PrivacyPolicy = lazyRoute(() => import('@sdkwork/documents-pc-legal'), 'PrivacyPolicyPage');
const TermsOfService = lazyRoute(() => import('@sdkwork/documents-pc-legal'), 'TermsOfServicePage');
const CookiePolicy = lazyRoute(() => import('@sdkwork/documents-pc-legal'), 'CookiePolicyPage');
const Playground = lazyRoute(() => import('@sdkwork/cloudrouter-pc-playground'), 'Playground');
const CloudRouterTokenPlanPage = lazyRoute(() => import('./token-plan/CloudRouterTokenPlanPage'), 'CloudRouterTokenPlanPage');
const CloudRouterAuthRoutes = lazyRoute(() => import('./auth/CloudRouterAuthRoutes'), 'CloudRouterAuthRoutes');
// Hosted app sign-in entry: native applications open the platform's
// `/iam/v3/oauth/authorize` in the system browser and return through the
// registered deep link. It is a public redirect surface, declared outside the
// `/auth/*` guard so it never needs (or waits for) a portal session.
const CloudRouterAppAuthorizeEntry = lazyRoute(
  () => import('./app-auth/CloudRouterAppAuthorizeEntry'),
  'CloudRouterAppAuthorizeEntry',
);
const PartnerJoinLanding = lazyRoute(() => import('@sdkwork/cloudrouter-pc-partner-join'), 'PartnerJoinLanding');
const PartnerJoinApply = lazyRoute(() => import('@sdkwork/cloudrouter-pc-partner-join'), 'PartnerJoinApply');
const PartnerJoinStatus = lazyRoute(() => import('@sdkwork/cloudrouter-pc-partner-join'), 'PartnerJoinStatus');

const DashboardView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-dashboard'), 'DashboardView');
const UsageView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-usage'), 'UsageView');
const GatewayView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-gateway'), 'GatewayView');
const ApiKeysView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-api-keys'), 'ApiKeysView');
// Agents capability: the console entry is a thin adapter that embeds the
// sdkwork-agents console block (agent catalog, creation/edit flow). Route
// packages must stay lazy-loaded (portal lazy-route rule), so the Agents console
// chunk loads with the route.
const AgentsView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-agents'), 'AgentsView');
// Same chunk as AgentsView (one dynamic import); the create/edit flow is a
// *flow* route rather than a section, so it is mounted outside the console branch
// below — no navbar, no sidebar, no content gutters, because the form owns its
// own header. See the route declaration for the ranking that keeps it there.
const AgentsEditorPage = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-agents'), 'AgentsEditorPage');
// Memory capability: the console entry is a thin adapter that embeds the
// sdkwork-memory console block. Route packages must stay lazy-loaded (portal
// lazy-route rule), so the Memory console chunk loads with the route.
const MemoryView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-memory'), 'MemoryView');

// The api-keys service layer resolves clients through the injectable seam
// (embeddable hosts construct their own); the console binds the shared
// factories here with lazy-singleton semantics preserved. Route packages
// must stay lazy-loaded (portal lazy-route rule), so the binding runs as a
// side effect of the dynamic import that also prewarms the console chunk.
void Promise.all([
  import('@sdkwork/cloudrouter-pc-console-core/sdk'),
  import('@sdkwork/cloudrouter-pc-console-api-keys'),
]).then(
  ([
    { getCloudRouterAppSdkClient, getModelsAppSdkClient },
    { configureApiKeyServiceClients },
  ]) => {
    configureApiKeyServiceClients({
      appClient: () => getCloudRouterAppSdkClient(),
      modelsClient: () => getModelsAppSdkClient(),
    });
  },
);
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

function PublicDocumentsHost({ children }: { children: React.ReactNode }) {
  const runtime = useMemo(
    () => ({ client: createCloudRouterPublicDocumentsClient(), basePath: '/docs' }),
    [],
  );
  return <PublicDocumentsRuntimeProvider value={runtime}>{children}</PublicDocumentsRuntimeProvider>;
}

function PublicDocumentReaderRoute() {
  const { documentRef } = useParams<{ documentRef?: string }>();
  return (
    <PublicDocumentsHost>
      <PublicDocumentReader documentRef={documentRef} />
    </PublicDocumentsHost>
  );
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
      Pricing={Pricing}
      Docs={Docs}
      ApiReference={ApiReference}
      ProductDocs={ProductDocs}
      SdkReference={SdkReference}
      Playground={Playground}
      TokenPlan={CloudRouterTokenPlanPage}
      extraRoutes={
        <>
          {/* Partner join (伙伴计划) — public portal marketing module outside console/admin. */}
          <Route path="/partner-join" element={<PartnerJoinLanding />} />
          <Route path="/partner-join/apply" element={<PartnerJoinApply />} />
          <Route path="/partner-join/status" element={<PartnerJoinStatus />} />
          <Route
            path="/docs"
            element={
              <PublicDocumentsHost>
                <PublicDocumentIndex />
              </PublicDocumentsHost>
            }
          />
          <Route path="/docs/:documentRef" element={<PublicDocumentReaderRoute />} />
          {/* Public legal policy pages shared with sdkwork-documents. The footer
              links here by default when the operator has not published an
              external privacy or terms URL. */}
          <Route path={LEGAL_DOCUMENT_PATHS['privacy-policy']} element={<PrivacyPolicy />} />
          <Route path={LEGAL_DOCUMENT_PATHS['terms-of-service']} element={<TermsOfService />} />
          <Route path={LEGAL_DOCUMENT_PATHS['cookie-policy']} element={<CookiePolicy />} />
        </>
      }
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
            <Route path="/iam/v3/oauth/authorize" element={<CloudRouterAppAuthorizeEntry />} />
            <Route path="/iam/oauth/authorize" element={<CloudRouterAppAuthorizeEntry />} />
            <Route path="/auth/app" element={<CloudRouterAppAuthorizeEntry />} />
            <Route path="/auth/*" element={<PortalAuthenticatedAuthRouteGuard><CloudRouterAuthRoutes /></PortalAuthenticatedAuthRouteGuard>} />

            {/* Agents create/edit renders full-bleed, so it is declared as a
                sibling of the console branch rather than a child of it: the form
                is the whole page and the console chrome would fight its own
                header. React Router ranks this static path above the console
                branch's `agents/*` splat, and `agentsConsoleIntegration.test.ts`
                pins that ranking so the shell cannot quietly swallow the flow. */}
            <Route
              path="/console/agents/editor/:agentId?"
              element={<PortalErrorBoundary><RequirePortalSession><AgentsEditorPage /></RequirePortalSession></PortalErrorBoundary>}
            />

            {/* Console Routes - standalone structure with global Navbar */}
            <Route path="/console" element={<PortalErrorBoundary><RequirePortalSession><ConsoleLayout isDark={isDark} toggleTheme={toggleTheme} theme={theme} setTheme={setTheme} themeColor={themeColor} setThemeColor={setThemeColor} navbarAuthenticatedActionsStart={<CloudRouterConsoleBusinessNavbarActions isDark={isDark} routePrefix="/console" />} /></RequirePortalSession></PortalErrorBoundary>}>
              <Route index element={<Navigate to="/console/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardView />} />
              <Route path="usage" element={<UsageView />} />
              <Route path="gateway" element={<GatewayView />} />
              <Route path="api-keys" element={<ApiKeysView />} />
              {/* Agents console: module sub-routes stay deep-linkable, and the
                  editor deep link carries the agent id. */}
              <Route path="agents/*" element={<AgentsView />} />
              {/* Memory console: module sub-routes stay deep-linkable. */}
              <Route path="memory/*" element={<MemoryView />} />
              <Route path="iam/oauth/official-accounts/:resourceAccountId/custom-menus" element={<CloudRouterConsoleIamOauthMenuRoute />} />
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

            <Route path="*" element={<RequirePortalSession><MainLayout isDark={isDark} toggleTheme={toggleTheme} /></RequirePortalSession>} />
          </Routes>
        </Suspense>
      </div>
      </SdkworkSessionAuthBrowserRoot>
    </BrowserRouter>
  );
}
