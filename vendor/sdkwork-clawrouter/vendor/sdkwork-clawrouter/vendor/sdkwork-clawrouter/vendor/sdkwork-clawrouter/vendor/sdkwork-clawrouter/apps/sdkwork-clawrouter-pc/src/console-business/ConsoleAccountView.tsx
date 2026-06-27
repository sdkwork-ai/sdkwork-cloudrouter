import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BusinessStatePanel } from '@sdkwork/clawrouter-pc-commons/components/BusinessState';
import {
  SdkworkWalletBalancePanel,
  SdkworkWalletIntlProvider,
  SdkworkWalletSummaryCards,
  useSdkworkWalletController,
  useSdkworkWalletControllerState,
  useSdkworkWalletIntl,
} from '@sdkwork/account-pc-wallet';

import { useConsoleBusinessNavigation } from './consoleBusinessNavigation.ts';

export function ConsoleAccountView() {
  return (
    <SdkworkWalletIntlProvider>
      <ConsoleAccountViewContent />
    </SdkworkWalletIntlProvider>
  );
}

function ConsoleAccountViewContent() {
  const controller = useSdkworkWalletController();
  const state = useSdkworkWalletControllerState(controller);
  const { copy } = useSdkworkWalletIntl();
  const { t } = useTranslation();
  const { couponsPath, walletPath } = useConsoleBusinessNavigation();

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading) {
      void controller.bootstrap();
    }
  }, [controller, state.isBootstrapped, state.isLoading]);

  if (state.isLoading && !state.isBootstrapped) {
    return <BusinessStatePanel kind="loading" title={copy.page.loading} />;
  }

  if (state.lastError) {
    return (
      <BusinessStatePanel kind="error" title={copy.page.errorTitle} description={state.lastError} />
    );
  }

  return (
    <div className="relative h-full overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
      <div className="mx-auto flex max-w-[96rem] flex-col gap-5">
        <SdkworkWalletBalancePanel
          onOpenRecharge={() => {
            controller.openRecharge();
          }}
          onOpenWithdraw={() => {
            controller.openWithdraw();
          }}
          overview={state.overview}
        />

        <SdkworkWalletSummaryCards overview={state.overview} />

        <div className="flex flex-wrap justify-end gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--sdk-color-border-default)] px-4 py-2 text-sm font-medium text-[var(--sdk-color-text-primary)] transition-colors hover:bg-[var(--sdk-color-surface-panel-muted)]"
            to={couponsPath}
          >
            {t('console.account.linkToCoupons', 'Coupons and redeem codes')}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--sdk-color-border-default)] px-4 py-2 text-sm font-medium text-[var(--sdk-color-text-primary)] transition-colors hover:bg-[var(--sdk-color-surface-panel-muted)]"
            to={walletPath}
          >
            {t('console.account.linkToWallet', 'Open recharge center')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
