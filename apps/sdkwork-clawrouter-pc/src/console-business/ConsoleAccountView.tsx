import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons/components/BusinessState';
import {
  useSdkworkWalletController,
  useSdkworkWalletControllerState,
  useSdkworkWalletIntl,
} from '@sdkwork/account-pc-wallet';

import { usePortalIamSession } from '../auth/usePortalIamSession.ts';
import { ClawRouterTokenBankBalancePanel } from './ClawRouterTokenBankBalancePanel.tsx';
import { ClawRouterTokenBankIntlProvider } from './ClawRouterTokenBankIntlProvider.tsx';
import {
  ClawRouterTokenBankTransactionList,
  getTokenBankTransactions,
} from './ClawRouterTokenBankTransactionList.tsx';
import { ConsoleAccountQuickActions } from './ConsoleAccountQuickActions.tsx';
import { resolveConsoleWalletLocale } from './consoleCommerceLocale.ts';
import { CLAW_ROUTER_COMMERCE_LINK_CLASS } from './consoleCommerceTheme.ts';
import { useConsoleBusinessNavigation } from './consoleBusinessNavigation.ts';

const RECENT_TRANSACTION_LIMIT = 5;

export function ConsoleAccountView() {
  const { i18n } = useTranslation();
  const walletLocale = resolveConsoleWalletLocale(i18n.resolvedLanguage ?? i18n.language);

  return (
    <ClawRouterTokenBankIntlProvider locale={walletLocale}>
      <ConsoleAccountViewContent />
    </ClawRouterTokenBankIntlProvider>
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

  const tokenBankTransactions = getTokenBankTransactions(state.overview.transactions);

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full max-w-none">
        <div className="flex w-full max-w-none flex-col gap-3">
          <ClawRouterTokenBankBalancePanel
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
            <ClawRouterTokenBankTransactionList
              limit={RECENT_TRANSACTION_LIMIT}
              transactions={tokenBankTransactions}
            />

            {tokenBankTransactions.length > RECENT_TRANSACTION_LIMIT ? (
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
