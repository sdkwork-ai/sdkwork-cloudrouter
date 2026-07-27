import { Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@sdkwork/ui-pc-react';
import {
  useSdkworkWalletIntl,
  type SdkworkWalletOverview,
} from '@sdkwork/account-pc-wallet';

interface ClawRouterTokenBankBalancePanelProps {
  onOpenRecharge: () => void;
  onOpenWithdraw: () => void;
  overview: SdkworkWalletOverview;
}

export function ClawRouterTokenBankBalancePanel({
  onOpenRecharge,
  onOpenWithdraw,
  overview,
}: ClawRouterTokenBankBalancePanelProps) {
  const { t } = useTranslation();
  const { formatCurrencyCny, formatTokenBank } = useSdkworkWalletIntl();

  return (
    <section className="overflow-hidden rounded-[var(--sdk-radius-panel)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)]">
      <div className="flex flex-col gap-4 border-b border-[var(--sdk-color-border-subtle)] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[var(--sdk-color-brand-primary)]" aria-hidden="true" />
            <h1 className="text-lg font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
              {t('console.tokenBank.account.title')}
            </h1>
          </div>
          <p className="mt-1 max-w-xl text-sm text-[var(--sdk-color-text-secondary)]">
            {t('console.tokenBank.account.description')}
          </p>
          {!overview.isAuthenticated ? (
            <p className="mt-2 text-xs text-[var(--sdk-color-text-muted)]">
              {t('console.tokenBank.account.signIn')}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button onClick={onOpenRecharge} type="button">
            {t('console.tokenBank.actions.recharge')}
          </Button>
          <Button onClick={onOpenWithdraw} type="button" variant="outline">
            {t('console.tokenBank.actions.withdrawCash')}
          </Button>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-6">
        <p className="text-sm text-[var(--sdk-color-text-secondary)]">
          {t('console.tokenBank.balance.available')}
        </p>
        <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-[var(--sdk-color-text-primary)]">
          {formatTokenBank(overview.account.tokenBankAvailable)}
        </p>
      </div>

      <dl className="grid grid-cols-2 border-t border-[var(--sdk-color-border-subtle)]">
        <div className="px-5 py-4 sm:px-6">
          <dt className="text-xs text-[var(--sdk-color-text-muted)]">
            {t('console.tokenBank.balance.frozen')}
          </dt>
          <dd className="mt-1 text-sm font-medium tabular-nums text-[var(--sdk-color-text-primary)]">
            {formatTokenBank(overview.account.tokenBankFrozen)}
          </dd>
        </div>
        <div className="border-l border-[var(--sdk-color-border-subtle)] px-5 py-4 sm:px-6">
          <dt className="text-xs text-[var(--sdk-color-text-muted)]">
            {t('console.tokenBank.balance.cashAvailable')}
          </dt>
          <dd className="mt-1 text-sm font-medium tabular-nums text-[var(--sdk-color-text-primary)]">
            {formatCurrencyCny(overview.account.cashAvailable)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
