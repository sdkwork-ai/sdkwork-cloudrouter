import { useTranslation } from 'react-i18next';
import {
  useSdkworkWalletIntl,
  type SdkworkWalletTransaction,
} from '@sdkwork/account-pc-wallet';

interface ClawRouterTokenBankTransactionListProps {
  limit?: number;
  transactions: SdkworkWalletTransaction[];
}

export function getTokenBankTransactions(
  transactions: SdkworkWalletTransaction[],
): SdkworkWalletTransaction[] {
  return transactions.filter((transaction) => transaction.tokenBankDelta !== 0);
}

export function ClawRouterTokenBankTransactionList({
  limit,
  transactions,
}: ClawRouterTokenBankTransactionListProps) {
  const { t } = useTranslation();
  const {
    formatTokenBankDelta,
    formatTransactionStatus,
    formatTransactionTimestamp,
  } = useSdkworkWalletIntl();
  const tokenBankTransactions = getTokenBankTransactions(transactions);
  const visibleTransactions = limit === undefined
    ? tokenBankTransactions
    : tokenBankTransactions.slice(0, limit);

  return (
    <section className="overflow-hidden rounded-[var(--sdk-radius-panel)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)]">
      <div className="border-b border-[var(--sdk-color-border-subtle)] px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
          {t('console.tokenBank.transactions.title')}
        </h2>
        <p className="mt-1 text-xs text-[var(--sdk-color-text-secondary)]">
          {t('console.tokenBank.transactions.description')}
        </p>
      </div>

      {visibleTransactions.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[var(--sdk-color-text-secondary)] sm:px-6">
          {t('console.tokenBank.transactions.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="bg-[var(--sdk-color-surface-panel-muted)] text-xs text-[var(--sdk-color-text-muted)]">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">{t('console.recharge.records.table.title')}</th>
                <th className="px-5 py-3 font-medium">{t('console.tokenBank.name')}</th>
                <th className="px-5 py-3 font-medium">{t('console.recharge.records.table.status')}</th>
                <th className="px-5 py-3 font-medium sm:px-6">{t('console.recharge.records.table.time')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sdk-color-border-subtle)]">
              {visibleTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-5 py-3 font-medium text-[var(--sdk-color-text-primary)] sm:px-6">
                    {transaction.title}
                  </td>
                  <td className={`px-5 py-3 font-medium tabular-nums ${transaction.tokenBankDelta >= 0 ? 'text-[var(--sdk-color-state-success)]' : 'text-[var(--sdk-color-text-primary)]'}`}>
                    {formatTokenBankDelta(transaction.tokenBankDelta)}
                  </td>
                  <td className="px-5 py-3 text-[var(--sdk-color-text-secondary)]">
                    {formatTransactionStatus(transaction.status)}
                  </td>
                  <td className="px-5 py-3 text-[var(--sdk-color-text-secondary)] sm:px-6">
                    {formatTransactionTimestamp(transaction.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
