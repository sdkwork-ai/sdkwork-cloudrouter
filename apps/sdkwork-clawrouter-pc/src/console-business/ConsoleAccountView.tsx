import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons/components/BusinessState';
import {
  SdkworkWalletBalancePanel,
  SdkworkWalletIntlProvider,
  SdkworkWalletTransactionList,
  useSdkworkWalletController,
  useSdkworkWalletControllerState,
  useSdkworkWalletIntl,
} from '@sdkwork/account-pc-wallet';

import { usePortalIamSession } from '../auth/usePortalIamSession.ts';
import { ConsoleAccountQuickActions } from './ConsoleAccountQuickActions.tsx';
import { resolveConsoleWalletLocale } from './consoleCommerceLocale.ts';
import { CLAW_ROUTER_COMMERCE_LINK_CLASS } from './consoleCommerceTheme.ts';
import { useConsoleBusinessNavigation } from './consoleBusinessNavigation.ts';

const RECENT_TRANSACTION_LIMIT = 5;

export function ConsoleAccountView() {
  const { i18n } = useTranslation();
  const walletLocale = resolveConsoleWalletLocale(i18n.resolvedLanguage ?? i18n.language);

  return (
    <SdkworkWalletIntlProvider locale={walletLocale}>
      <ConsoleAccountViewContent />
    </SdkworkWalletIntlProvider>
  );
}

function ConsoleAccountViewContent() {
  const controller = useSdkworkWalletController();
  const state = useSdkworkWalletControllerState(controller);
  const isAuthenticated = usePortalIamSession();
  const { copy } = useSdkworkWalletIntl();
  const { t } = useTranslation();
  const { onNavigate, walletPath } = useConsoleBusinessNavigation();

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading && !state.lastError) {
      void controller.bootstrap().catch(() => undefined);
    }
  }, [controller, state.isBootstrapped, state.isLoading, state.lastError]);

  if (state.isLoading && !state.isBootstrapped) {
    return <BusinessStatePanel kind="loading" title={copy.page.loading} />;
  }

  if (state.lastError) {
    return (
      <BusinessStatePanel kind="error" title={copy.page.errorTitle} description={state.lastError} />
    );
  }

  const recentTransactions = state.overview.transactions.slice(0, RECENT_TRANSACTION_LIMIT);

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full max-w-none">
        <div className="flex w-full max-w-none flex-col gap-3">
          <SdkworkWalletBalancePanel
            onOpenRecharge={() => {
              onNavigate(walletPath);
            }}
            onOpenWithdraw={() => {
              onNavigate(walletPath);
            }}
            overview={{ ...state.overview, isAuthenticated }}
          />

          <ConsoleAccountQuickActions />

          <div className="space-y-3">
            <SdkworkWalletTransactionList transactions={recentTransactions} />

            {state.overview.transactions.length > RECENT_TRANSACTION_LIMIT ? (
              <div className="flex justify-end">
                <Link className={CLAW_ROUTER_COMMERCE_LINK_CLASS} to={walletPath}>
                  {t('console.account.viewAllActivity', 'View all activity')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
