import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import {
  ConsoleApiKeysScreen,
  type ConsoleApiKeysLabels,
} from '@sdkwork/cloudrouter-h5-console-api-keys';
import { ConsoleCatalogScreen, type ConsoleCatalogLabels } from '@sdkwork/cloudrouter-h5-console-catalog';
import {
  ConsoleDashboardScreen,
  ConsoleHomeScreen,
  type ConsoleDashboardLabels,
  type ConsoleHomeDestination,
  type ConsoleHomeLabels,
} from '@sdkwork/cloudrouter-h5-console-dashboard';
import { ConsoleUsageScreen, type ConsoleUsageLabels } from '@sdkwork/cloudrouter-h5-console-usage';
import { ConsoleShellLayout, ConsoleProfileScreen, SessionRequiredState } from '@sdkwork/cloudrouter-h5-shell';
import { PlaygroundScreen } from '@sdkwork/cloudrouter-h5-playground';
import { MessagesScreen, MessagesDetailScreen } from '@sdkwork/cloudrouter-h5-messages';
import { SettingsScreen } from '@sdkwork/cloudrouter-h5-settings';
import type {
  ConsoleProfileDestination,
  ConsoleProfileLabels,
} from '@sdkwork/cloudrouter-h5-shell';
import { CLOUDROUTER_CONSOLE_ROUTES } from '@sdkwork/cloudrouter-contracts';
import { CLOUDROUTER_H5_ORDER_ROUTES } from '@sdkwork/cloudrouter-h5-orders/routes';
import { getCachedH5SiteBranding } from '@sdkwork/cloudrouter-h5-core/branding';

import { useConsoleRuntime } from '../providers/AppProviders.js';
import { RouteErrorBoundary } from './RouteErrorBoundary.js';

/**
 * Console route assembly.
 *
 * The home tab (`/dashboard`) is the public landing surface: it renders the
 * marketing/overview composition when no session exists and the real overview
 * once signed in. The other three console tabs keep the shared contract's
 * authenticated posture and render an in-canvas session state that links to the
 * dedicated `/sign-in` route (mounted outside this shell, because the sign-in
 * route is never a tab). The shell — header, canvas, and bottom tab bar — stays
 * mounted across all four tab roots.
 */
export function MessagesDetailRoute() {
  const runtime = useConsoleRuntime();
  return <MessagesDetailScreen currentUserId={runtime.accountId} />;
}

export function SettingsRoute() {
  const runtime = useConsoleRuntime();
  const navigate = useNavigate();
  return (
    <SettingsScreen
      accountId={runtime.accountId}
      doneLabel={runtime.translate('cloudrouter.console.settings.done')}
      description={runtime.translate('cloudrouter.console.settings.description')}
      initialTheme={runtime.theme}
      locale={runtime.locale}
      onAction={(settingId) => {
        const branding = getCachedH5SiteBranding();
        const url =
          settingId === 'about.terms'
            ? branding.termsUrl
            : settingId === 'about.privacy-policy'
              ? branding.privacyUrl
              : null;
        if (url && typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }}
      onBack={() => navigate('/me')}
      onThemeChange={runtime.setTheme}
      title={runtime.translate('cloudrouter.console.settings.title')}
    />
  );
}

export function ConsoleRouteAssembly() {
  const runtime = useConsoleRuntime();
  const navigate = useNavigate();
  const {
    ports,
    locale,
    translate,
    authenticated,
    brandName,
    accountId,
  } = runtime;

  const sessionRequired = {
    title: translate('cloudrouter.console.shared.signInRequiredTitle'),
    message: translate('cloudrouter.console.shared.signInRequiredMessage'),
    action: translate('cloudrouter.console.shared.signInAction'),
  };

  const openSignIn = (from: string) => navigate('/sign-in', { state: { from } });

  const openHelp = () => {
    const branding = getCachedH5SiteBranding();
    const url = branding.supportUrl || branding.docsUrl || 'https://sdkwork.com/support';
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleHomeNavigate = (destination: ConsoleHomeDestination) => {
    switch (destination) {
      case 'membership':
        navigate('/membership');
        break;
      case 'recharge':
        navigate('/recharge');
        break;
      case 'coupons':
        navigate('/recharge', { state: { tab: 'coupon' } });
        break;
      case 'apiKeys':
        navigate(CLOUDROUTER_CONSOLE_ROUTES.apiKeys.path);
        break;
      case 'usage':
        navigate(CLOUDROUTER_CONSOLE_ROUTES.usage.path);
        break;
      case 'orders':
        navigate(CLOUDROUTER_H5_ORDER_ROUTES.orderCenter.path);
        break;
      case 'catalog':
        navigate(CLOUDROUTER_CONSOLE_ROUTES.catalog.path);
        break;
      case 'dashboard':
        navigate(CLOUDROUTER_CONSOLE_ROUTES.dashboard.path);
        break;
      case 'help':
        openHelp();
        break;
      case 'signIn':
        openSignIn(CLOUDROUTER_CONSOLE_ROUTES.dashboard.path);
        break;
      case 'signOut':
        runtime.signOut();
        break;
    }
  };

  const openPrivacy = () => {
    const branding = getCachedH5SiteBranding();
    const url = branding.privacyUrl || branding.termsUrl;
    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleProfileNavigate = (destination: ConsoleProfileDestination) => {
    switch (destination) {
      case 'signIn':
        openSignIn('/me');
        break;
      case 'signOut':
        runtime.signOut();
        break;
      case 'recharge':
        navigate('/recharge');
        break;
      case 'membership':
        navigate('/membership');
        break;
      case 'coupons':
        navigate('/recharge', { state: { tab: 'coupon' } });
        break;
      case 'orders':
        navigate(CLOUDROUTER_H5_ORDER_ROUTES.orderCenter.path);
        break;
      case 'help':
        openHelp();
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'privacy':
        openPrivacy();
        break;
      case 'about':
        break;
    }
  };

  return (
    <ConsoleShellLayout
      brandName={brandName}
      labelForKey={(key) => translate(key)}
    >
      <RouteErrorBoundary
        labels={{
          title: translate('cloudrouter.console.shared.errorTitle'),
          message: translate('cloudrouter.console.shared.errorMessage'),
          retry: translate('cloudrouter.console.shared.reload'),
        }}
      >
        <Routes>
          <Route
            path="/"
            element={<Navigate to={CLOUDROUTER_CONSOLE_ROUTES.dashboard.path} replace />}
          />
          <Route
            path={CLOUDROUTER_CONSOLE_ROUTES.dashboard.path}
            element={
              authenticated ? (
                <ConsoleDashboardScreen
                  ports={ports}
                  locale={locale}
                  labels={dashboardLabels(translate)}
                />
              ) : (
                <ConsoleHomeScreen
                  labels={homeLabels(translate)}
                  brandName={brandName}
                  authenticated={authenticated}
                  onNavigate={handleHomeNavigate}
                />
              )
            }
          />
          <Route
            path={CLOUDROUTER_CONSOLE_ROUTES.usage.path}
            element={
              authenticated ? (
                <ConsoleUsageScreen ports={ports} locale={locale} labels={usageLabels(translate)} />
              ) : (
                <SessionRequiredState
                  {...sessionRequired}
                  onSignIn={() => openSignIn(CLOUDROUTER_CONSOLE_ROUTES.usage.path)}
                />
              )
            }
          />
          <Route
            path={CLOUDROUTER_CONSOLE_ROUTES.apiKeys.path}
            element={
              authenticated ? (
                <ConsoleApiKeysScreen ports={ports} locale={locale} labels={apiKeyLabels(translate)} />
              ) : (
                <SessionRequiredState
                  {...sessionRequired}
                  onSignIn={() => openSignIn(CLOUDROUTER_CONSOLE_ROUTES.apiKeys.path)}
                />
              )
            }
          />
          <Route
            path={CLOUDROUTER_CONSOLE_ROUTES.catalog.path}
            element={
              authenticated ? (
                <ConsoleCatalogScreen ports={ports} locale={locale} labels={catalogLabels(translate)} />
              ) : (
                <SessionRequiredState
                  {...sessionRequired}
                  onSignIn={() => openSignIn(CLOUDROUTER_CONSOLE_ROUTES.catalog.path)}
                />
              )
            }
          />
          <Route
            path="/messages"
            element={
              authenticated ? (
                <div className="cloudrouter-messages-screen h-full min-h-0">
                  <MessagesScreen />
                </div>
              ) : (
                <SessionRequiredState
                  {...sessionRequired}
                  onSignIn={() => openSignIn('/messages')}
                />
              )
            }
          />
          <Route
            path="/playground"
            element={
              authenticated ? (
                <PlaygroundScreen
                  welcomeTitle={translate('cloudrouter.console.playground.title')}
                  welcomeMessage={translate('cloudrouter.console.playground.welcome')}
                />
              ) : (
                <SessionRequiredState
                  {...sessionRequired}
                  onSignIn={() => openSignIn('/playground')}
                />
              )
            }
          />
          <Route
            path="/me"
            element={
              <ConsoleProfileScreen
                labels={profileLabels(translate)}
                brandName={brandName}
                accountId={accountId}
                authenticated={authenticated}
                balanceText="--"
                couponCountText="--"
                invoiceAmountText="--"
                onNavigate={handleProfileNavigate}
              />
            }
          />
          <Route
            path="*"
            element={<Navigate to={CLOUDROUTER_CONSOLE_ROUTES.dashboard.path} replace />}
          />
        </Routes>
      </RouteErrorBoundary>
    </ConsoleShellLayout>
  );
}

function homeLabels(translate: (key: string) => string): ConsoleHomeLabels {
  return {
    badge: translate('cloudrouter.console.home.badge'),
    heroTitleLead: translate('cloudrouter.console.home.heroTitleLead'),
    heroTitleHighlight: translate('cloudrouter.console.home.heroTitleHighlight'),
    heroSubtitle: translate('cloudrouter.console.home.heroSubtitle'),
    searchPlaceholder: translate('cloudrouter.console.home.searchPlaceholder'),
    searchEmpty: translate('cloudrouter.console.home.searchEmpty'),
    searchClear: translate('cloudrouter.console.home.searchClear'),
    searchResults: translate('cloudrouter.console.home.searchResults'),
    quickTitle: translate('cloudrouter.console.home.quickTitle'),
    membership: translate('cloudrouter.console.home.membership'),
    recharge: translate('cloudrouter.console.home.recharge'),
    apiKeys: translate('cloudrouter.console.home.apiKeys'),
    usage: translate('cloudrouter.console.home.usage'),
    membershipBadge: translate('cloudrouter.console.home.membershipBadge'),
    rechargeBadge: translate('cloudrouter.console.home.rechargeBadge'),
    servicesTitle: translate('cloudrouter.console.home.servicesTitle'),
    serviceOrders: translate('cloudrouter.console.home.serviceOrders'),
    serviceBills: translate('cloudrouter.console.home.serviceBills'),
    serviceCoupons: translate('cloudrouter.console.home.serviceCoupons'),
    serviceLedger: translate('cloudrouter.console.home.serviceLedger'),
    serviceInvoices: translate('cloudrouter.console.home.serviceInvoices'),
    serviceHelp: translate('cloudrouter.console.home.serviceHelp'),
    serviceNews: translate('cloudrouter.console.home.serviceNews'),
    serviceMembership: translate('cloudrouter.console.home.serviceMembership'),
    serviceModels: translate('cloudrouter.console.home.serviceModels'),
    serviceMore: translate('cloudrouter.console.home.serviceMore'),
    announcement: translate('cloudrouter.console.home.announcement'),
    promoBadge: translate('cloudrouter.console.home.promoBadge'),
    promoTitle: translate('cloudrouter.console.home.promoTitle'),
    promoDesc: translate('cloudrouter.console.home.promoDesc'),
    promoCta: translate('cloudrouter.console.home.promoCta'),
    experienceTitle: translate('cloudrouter.console.home.experienceTitle'),
    experienceMore: translate('cloudrouter.console.home.experienceMore'),
    experienceGatewayTitle: translate('cloudrouter.console.home.experienceGatewayTitle'),
    experienceGatewayDesc: translate('cloudrouter.console.home.experienceGatewayDesc'),
    experienceGatewayCta: translate('cloudrouter.console.home.experienceGatewayCta'),
    experienceConsoleTitle: translate('cloudrouter.console.home.experienceConsoleTitle'),
    experienceConsoleDesc: translate('cloudrouter.console.home.experienceConsoleDesc'),
    experienceConsoleCta: translate('cloudrouter.console.home.experienceConsoleCta'),
    moreTitle: translate('cloudrouter.console.home.moreTitle'),
    moreSignIn: translate('cloudrouter.console.home.moreSignIn'),
    moreSignOut: translate('cloudrouter.console.home.moreSignOut'),
    moreHelp: translate('cloudrouter.console.home.moreHelp'),
    moreAbout: translate('cloudrouter.console.home.moreAbout'),
    moreClose: translate('cloudrouter.console.home.moreClose'),
    statModels: translate('cloudrouter.console.home.statModels'),
    statVendors: translate('cloudrouter.console.home.statVendors'),
    statUptime: translate('cloudrouter.console.home.statUptime'),
    statRegions: translate('cloudrouter.console.home.statRegions'),
    trust: translate('cloudrouter.console.home.trust'),
    footer: translate('cloudrouter.console.home.footer'),
  };
}

function profileLabels(translate: (key: string) => string): ConsoleProfileLabels {
  return {
    guestTitle: translate('cloudrouter.console.profile.guestTitle'),
    guestHint: translate('cloudrouter.console.profile.guestHint'),
    accountFallback: translate('cloudrouter.console.profile.accountFallback'),
    verified: translate('cloudrouter.console.profile.verified'),
    balance: translate('cloudrouter.console.profile.balance'),
    recharge: translate('cloudrouter.console.profile.recharge'),
    autoRecharge: translate('cloudrouter.console.profile.autoRecharge'),
    coupons: translate('cloudrouter.console.profile.coupons'),
    invoices: translate('cloudrouter.console.profile.invoices'),
    operationRecords: translate('cloudrouter.console.profile.operationRecords'),
    helpCenter: translate('cloudrouter.console.profile.helpCenter'),
    settings: translate('cloudrouter.console.profile.settings'),
    other: translate('cloudrouter.console.profile.other'),
    privacy: translate('cloudrouter.console.profile.privacy'),
    about: translate('cloudrouter.console.profile.about'),
    signIn: translate('cloudrouter.console.profile.signIn'),
    signOut: translate('cloudrouter.console.profile.signOut'),
    close: translate('cloudrouter.console.profile.close'),
    footer: translate('cloudrouter.console.profile.footer'),
  };
}

function dashboardLabels(translate: (key: string) => string): ConsoleDashboardLabels & {
  loading: string;
  empty: string;
  reload: string;
} {
  return {
    title: translate('cloudrouter.console.dashboard.title'),
    summary: translate('cloudrouter.console.dashboard.summary'),
    requests: translate('cloudrouter.console.dashboard.requests'),
    tokens: translate('cloudrouter.console.dashboard.tokens'),
    cost: translate('cloudrouter.console.dashboard.cost'),
    errorRate: translate('cloudrouter.console.dashboard.errorRate'),
    loading: translate('cloudrouter.console.shared.loading'),
    empty: translate('cloudrouter.console.shared.empty'),
    reload: translate('cloudrouter.console.shared.reload'),
  };
}

function usageLabels(translate: (key: string) => string): ConsoleUsageLabels & {
  loading: string;
  empty: string;
  reload: string;
  loadMore: string;
} {
  return {
    title: translate('cloudrouter.console.usage.title'),
    summary: translate('cloudrouter.console.usage.summary'),
    columnModel: translate('cloudrouter.console.usage.columnModel'),
    columnTokens: translate('cloudrouter.console.usage.columnTokens'),
    columnCost: translate('cloudrouter.console.usage.columnCost'),
    columnStatus: translate('cloudrouter.console.usage.columnStatus'),
    columnTime: translate('cloudrouter.console.usage.columnTime'),
    statusSucceeded: translate('cloudrouter.console.usage.statusSucceeded'),
    statusFailed: translate('cloudrouter.console.usage.statusFailed'),
    statusProcessing: translate('cloudrouter.console.usage.statusProcessing'),
    statusUnknown: translate('cloudrouter.console.usage.statusUnknown'),
    loading: translate('cloudrouter.console.shared.loading'),
    empty: translate('cloudrouter.console.shared.empty'),
    reload: translate('cloudrouter.console.shared.reload'),
    loadMore: translate('cloudrouter.console.shared.loadMore'),
  };
}

function apiKeyLabels(translate: (key: string) => string): ConsoleApiKeysLabels & {
  loading: string;
  empty: string;
  reload: string;
  createdOnce: string;
  loadMore: string;
} {
  return {
    title: translate('cloudrouter.console.apiKeys.title'),
    summary: translate('cloudrouter.console.apiKeys.summary'),
    create: translate('cloudrouter.console.apiKeys.create'),
    creating: translate('cloudrouter.console.apiKeys.creating'),
    revoke: translate('cloudrouter.console.apiKeys.revoke'),
    namePlaceholder: translate('cloudrouter.console.apiKeys.namePlaceholder'),
    columnStatus: translate('cloudrouter.console.apiKeys.title'),
    columnTime: translate('cloudrouter.console.usage.columnTime'),
    statusActive: translate('cloudrouter.console.apiKeys.statusActive'),
    statusDisabled: translate('cloudrouter.console.apiKeys.statusDisabled'),
    statusRevoked: translate('cloudrouter.console.apiKeys.statusRevoked'),
    loading: translate('cloudrouter.console.shared.loading'),
    empty: translate('cloudrouter.console.shared.empty'),
    reload: translate('cloudrouter.console.shared.reload'),
    createdOnce: translate('cloudrouter.console.apiKeys.createdOnce'),
    loadMore: translate('cloudrouter.console.shared.loadMore'),
  };
}

function catalogLabels(translate: (key: string) => string): ConsoleCatalogLabels & {
  loading: string;
  empty: string;
  reload: string;
} {
  return {
    title: translate('cloudrouter.console.catalog.title'),
    summary: translate('cloudrouter.console.catalog.summary'),
    columnVendor: translate('cloudrouter.console.catalog.columnVendor'),
    columnModel: translate('cloudrouter.console.catalog.columnModel'),
    columnInput: translate('cloudrouter.console.catalog.columnInput'),
    columnOutput: translate('cloudrouter.console.catalog.columnOutput'),
    loading: translate('cloudrouter.console.shared.loading'),
    empty: translate('cloudrouter.console.shared.empty'),
    reload: translate('cloudrouter.console.shared.reload'),
  };
}
