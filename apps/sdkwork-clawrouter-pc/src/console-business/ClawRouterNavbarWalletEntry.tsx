import { useTranslation } from 'react-i18next';
import {
  normalizeSdkworkWalletLocale,
  SdkworkWalletHeaderEntry,
  SdkworkWalletIntlProvider,
} from '@sdkwork/account-pc-wallet';

import { ClawRouterNavbarWalletQuickPanel } from './ClawRouterNavbarWalletQuickPanel.tsx';
import type { ClawRouterConsoleBusinessHostConfig } from './consoleBusinessConfig.ts';
import { useConsoleBusinessNavigation } from './consoleBusinessNavigation.ts';

export interface ClawRouterNavbarWalletEntryProps extends ClawRouterConsoleBusinessHostConfig {
  isDark: boolean;
}

export function ClawRouterNavbarWalletEntry({
  routePrefix,
}: ClawRouterNavbarWalletEntryProps) {
  const { i18n, t } = useTranslation();
  const {
    accountPath,
    checkoutPath,
    onNavigate,
  } = useConsoleBusinessNavigation({ routePrefix });
  const walletLocale = normalizeSdkworkWalletLocale(i18n.resolvedLanguage ?? i18n.language);

  return (
    <div className="claw-router-navbar-wallet-entry flex items-center gap-2">
      <SdkworkWalletIntlProvider locale={walletLocale}>
        <SdkworkWalletHeaderEntry
          QuickPanel={ClawRouterNavbarWalletQuickPanel}
          accountLabel={t('console.navbar.account', 'Account')}
          checkoutBasePath={checkoutPath}
          onNavigate={onNavigate}
          onOpenPage={() => {
            onNavigate(accountPath);
          }}
          quickPanelClassName="absolute right-0 top-[calc(100%+0.625rem)] z-50"
          rechargeFlow="direct"
        />
      </SdkworkWalletIntlProvider>
    </div>
  );
}
