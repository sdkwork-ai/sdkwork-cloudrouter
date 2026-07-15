import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons/components/BusinessState';
import {
  SdkworkWalletBalancePanel,
  SdkworkWalletIntlProvider,
  SdkworkWalletRechargeDialog,
  SdkworkWalletTransactionList,
  SdkworkWalletWithdrawDialog,
  useSdkworkWalletController,
  useSdkworkWalletControllerState,
  useSdkworkWalletIntl,
} from '@sdkwork/account-pc-wallet';

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
  const { copy } = useSdkworkWalletIntl();
  const { t } = useTranslation();
  const { checkoutPath, onNavigate, walletPath } = useConsoleBusinessNavigation();

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
      <div className="px-4 pb-3 sm:px-5 sm:pb-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          <SdkworkWalletBalancePanel
            onOpenRecharge={() => {
              controller.openRecharge();
            }}
            onOpenWithdraw={() => {
              controller.openWithdraw();
            }}
            overview={state.overview}
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

      <SdkworkWalletRechargeDialog
        checkoutBasePath={checkoutPath}
        controller={controller}
        onNavigate={onNavigate}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeRecharge();
          }
        }}
        open={state.isRechargeOpen}
        rechargeFlow="direct"
      />
      <SdkworkWalletWithdrawDialog
        controller={controller}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeWithdraw();
          }
        }}
        open={state.isWithdrawOpen}
      />
    </div>
  );
}
