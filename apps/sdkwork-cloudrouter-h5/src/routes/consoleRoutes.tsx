import { Navigate, Route, Routes } from 'react-router-dom';

import {
  ConsoleApiKeysScreen,
  type ConsoleApiKeysLabels,
} from '@sdkwork/cloudrouter-h5-console-api-keys';
import { ConsoleCatalogScreen, type ConsoleCatalogLabels } from '@sdkwork/cloudrouter-h5-console-catalog';
import {
  ConsoleDashboardScreen,
  type ConsoleDashboardLabels,
} from '@sdkwork/cloudrouter-h5-console-dashboard';
import { ConsoleUsageScreen, type ConsoleUsageLabels } from '@sdkwork/cloudrouter-h5-console-usage';
import { ConsoleShellLayout } from '@sdkwork/cloudrouter-h5-shell';
import { CLOUDROUTER_CONSOLE_ROUTES } from '@sdkwork/cloudrouter-contracts';

import { AppAuthGate } from '../AuthGate.js';
import { useConsoleRuntime } from '../providers/AppProviders.js';

export function ConsoleRouteAssembly() {
  const runtime = useConsoleRuntime();
  const { ports, locale, translate } = runtime;

  const shellLabels = {
    title: translate('cloudrouter.console.shared.appTitle'),
    subtitle: translate('cloudrouter.console.shared.appSubtitle'),
    signOut: translate('cloudrouter.console.shared.signOut'),
  };

  return (
    <AppAuthGate>
      <ConsoleShellLayout
        title={shellLabels.title}
        subtitle={shellLabels.subtitle}
        signOutLabel={shellLabels.signOut}
        labelForKey={(key) => translate(key)}
        onSignOut={runtime.signOut}
      >
        <Routes>
          <Route path="/" element={<Navigate to={CLOUDROUTER_CONSOLE_ROUTES.dashboard.path} replace />} />
          <Route
            path={CLOUDROUTER_CONSOLE_ROUTES.dashboard.path}
            element={
              <ConsoleDashboardScreen ports={ports} locale={locale} labels={dashboardLabels(translate)} />
            }
          />
          <Route
            path={CLOUDROUTER_CONSOLE_ROUTES.usage.path}
            element={<ConsoleUsageScreen ports={ports} locale={locale} labels={usageLabels(translate)} />}
          />
          <Route
            path={CLOUDROUTER_CONSOLE_ROUTES.apiKeys.path}
            element={<ConsoleApiKeysScreen ports={ports} locale={locale} labels={apiKeyLabels(translate)} />}
          />
          <Route
            path={CLOUDROUTER_CONSOLE_ROUTES.catalog.path}
            element={<ConsoleCatalogScreen ports={ports} locale={locale} labels={catalogLabels(translate)} />}
          />
          <Route path="*" element={<Navigate to={CLOUDROUTER_CONSOLE_ROUTES.dashboard.path} replace />} />
        </Routes>
      </ConsoleShellLayout>
    </AppAuthGate>
  );
}

function dashboardLabels(translate: (key: string) => string): ConsoleDashboardLabels & {
  loading: string;
  empty: string;
  reload: string;
} {
  return {
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
} {
  return {
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
  };
}

function apiKeyLabels(translate: (key: string) => string): ConsoleApiKeysLabels & {
  loading: string;
  empty: string;
  reload: string;
  createdOnce: string;
} {
  return {
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
  };
}

function catalogLabels(translate: (key: string) => string): ConsoleCatalogLabels & {
  loading: string;
  empty: string;
  reload: string;
} {
  return {
    columnVendor: translate('cloudrouter.console.catalog.columnVendor'),
    columnModel: translate('cloudrouter.console.catalog.columnModel'),
    columnInput: translate('cloudrouter.console.catalog.columnInput'),
    columnOutput: translate('cloudrouter.console.catalog.columnOutput'),
    loading: translate('cloudrouter.console.shared.loading'),
    empty: translate('cloudrouter.console.shared.empty'),
    reload: translate('cloudrouter.console.shared.reload'),
  };
}
