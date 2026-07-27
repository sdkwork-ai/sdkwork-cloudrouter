import { useMemo, type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SdkworkWalletIntlProvider,
  type SdkworkWalletMessagesOverrides,
} from '@sdkwork/account-pc-wallet';

interface ClawRouterTokenBankIntlProviderProps extends PropsWithChildren {
  locale: string;
}

export function ClawRouterTokenBankIntlProvider({
  children,
  locale,
}: ClawRouterTokenBankIntlProviderProps) {
  const { t } = useTranslation();
  const messages = useMemo<SdkworkWalletMessagesOverrides>(() => ({
    balancePanel: {
      tokenBankAvailableLabel: t('console.tokenBank.balance.available'),
    },
    headerEntry: {
      balanceAriaLabel: t('console.tokenBank.balance.ariaLabel'),
      pointsSuffix: t('console.tokenBank.unit'),
    },
    quickPanel: {
      tokenBankAvailableLabel: t('console.tokenBank.balance.available'),
    },
    summaryCards: {
      tokenBankAvailableLabel: t('console.tokenBank.balance.available'),
    },
    transactionList: {
      columnTokenBank: t('console.tokenBank.name'),
    },
    holdList: {
      tokenBankAsset: t('console.tokenBank.name'),
    },
  }), [t]);

  return (
    <SdkworkWalletIntlProvider locale={locale} messages={messages}>
      {children}
    </SdkworkWalletIntlProvider>
  );
}
