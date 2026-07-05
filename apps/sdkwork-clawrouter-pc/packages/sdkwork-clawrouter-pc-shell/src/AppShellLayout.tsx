import type { ComponentType, ReactNode } from 'react';
import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Footer, Navbar } from '@sdkwork/clawroutes-pc-commons';

export type AppShellRouteProps = {
  isDark: boolean;
  toggleTheme: () => void;
};

export type AppShellLayoutProps = AppShellRouteProps & {
  Home: ComponentType;
  Models: ComponentType;
  ModelDetails: ComponentType;
  Rankings: ComponentType;
  Docs: ComponentType;
  ApiReference: ComponentType;
  ProductDocs: ComponentType;
  SdkReference: ComponentType;
  Playground: ComponentType;
  TokenPlan: ComponentType;
  navbarAuthenticatedActionsStart?: ReactNode;
};

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export function RouteFallback() {
  const { pathname } = useLocation();

  if (pathname.startsWith('/auth')) {
    return (
      <div className="sdkwork-auth-route-fallback sdkwork-clawrouter-auth-route-fallback fixed inset-0 z-[60] h-[100dvh] min-h-[100dvh] w-full" />
    );
  }

  return <div className="min-h-[40vh] bg-white dark:bg-slate-950" />;
}

const PORTAL_HOST_OFFSET_ROUTE_PATTERN =
  /^\/(?:product-docs|docs|api-reference|token-plan)(?:\/|$)/;

export function AppShellLayout({
  isDark,
  toggleTheme,
  Home,
  Models,
  ModelDetails,
  Rankings,
  Docs,
  ApiReference,
  ProductDocs,
  SdkReference,
  Playground,
  TokenPlan,
  navbarAuthenticatedActionsStart,
}: AppShellLayoutProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const isPlayground = location.pathname.startsWith('/playground') || location.pathname.startsWith('/c/');
  const usesPortalHostOffset = PORTAL_HOST_OFFSET_ROUTE_PATTERN.test(location.pathname);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:shadow-md"
      >
        {t('common.skipToContent', 'Skip to content')}
      </a>
      <Navbar
        authenticatedActionsStart={navbarAuthenticatedActionsStart}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />
      <div
        id="main-content"
        className={
          isPlayground
            ? 'sdkwork-clawrouter-playground-host-offset flex-1'
            : usesPortalHostOffset
              ? 'sdkwork-clawrouter-documents-host-offset flex-1'
              : 'flex-1'
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/models" element={<Models />} />
          <Route path="/models/:id" element={<ModelDetails />} />
          <Route path="/models/:provider/:model" element={<ModelDetails />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/product-docs" element={<ProductDocs />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/api-reference" element={<ApiReference />} />
          <Route path="/sdk-reference" element={<SdkReference />} />
          <Route path="/playground/*" element={<Playground />} />
          <Route path="/c/:conversationId" element={<Playground />} />
          <Route path="/token-plan" element={<TokenPlan />} />
        </Routes>
      </div>
      {!isPlayground && <Footer />}
    </>
  );
}
