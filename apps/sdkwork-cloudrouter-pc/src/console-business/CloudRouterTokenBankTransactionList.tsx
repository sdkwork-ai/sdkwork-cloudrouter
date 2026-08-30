import { useTranslation } from 'react-i18next';
import {
  useSdkworkWalletIntl,
  type SdkworkWalletTransaction,
} from '@sdkwork/account-pc-wallet';

interface CloudRouterTokenBankTransactionListProps {
  limit?: number;
  transactions: SdkworkWalletTransaction[];
}

export function getTokenBankTransactions(
  transactions: SdkworkWalletTransaction[],
): SdkworkWalletTransaction[] {
  return transactions.filter((transaction) => transaction.tokenBankDelta !== 0);
}

/** Business types that represent a compute-credit consumption debit. */
const TOKEN_BANK_USAGE_TYPES = new Set([
  'gateway_invocation_billing',
  'usage_settlement',
]);

/** Business types that add compute credits to the Token Bank account. */
const TOKEN_BANK_CREDIT_TYPES = new Set([
  'token_bank_purchase_credit',
  'refund',
]);

/**
 * Maps a raw ledger business type into a human-readable, localized title.
 * Synchronous gateway billing now freezes each invocation into an account hold
 * and settles it as a SINGLE actual-consumption debit (`gateway_invocation_billing`),
 * so the wallet no longer pairs a provisional "消费" with an "adjust-credit"
 * "返还" record. The async worker (`usage_settlement`) and any historical
 * surplus returns may still emit a credit, so the signed delta still tells
 * debit vs. credit apart. Recharges (`token_bank_purchase_credit`) always add
 * credits.
 */
export function getTokenBankTransactionType(
  transaction: SdkworkWalletTransaction,
): string {
  return (transaction.transactionType || '').toLowerCase();
}

export function resolveTokenBankTransactionTitle(
  transaction: SdkworkWalletTransaction,
  translate: (key: string) => string,
): string {
  const type = getTokenBankTransactionType(transaction);
  const isCreditEntry = transaction.tokenBankDelta >= 0;

  if (TOKEN_BANK_USAGE_TYPES.has(type)) {
    return isCreditEntry
      ? translate('console.tokenBank.transactionTitles.gatewayReturn')
      : translate('console.tokenBank.transactionTitles.gatewayUsage');
  }
  if (type === 'token_bank_purchase_credit' || type === 'points_recharge') {
    return translate('console.tokenBank.transactionTitles.recharge');
  }
  if (type === 'refund') {
    return translate('console.tokenBank.transactionTitles.refund');
  }

  const rawTitle = transaction.title || '';
  const looksLikeInternalCode = /^[a-z_]+$/.test(rawTitle);
  if (rawTitle && !looksLikeInternalCode) {
    return rawTitle;
  }
  return translate('console.tokenBank.transactions.defaultTitle');
}

/** Returns a localized label that identifies the concrete billing scenario. */
export function resolveTokenBankBusinessTypeName(
  transaction: SdkworkWalletTransaction,
  translate: (key: string) => string,
): string {
  const type = getTokenBankTransactionType(transaction);
  if (!type) {
    return '';
  }
  const key = `console.tokenBank.businessTypes.${type}`;
  const localized = translate(key);
  if (localized !== key) {
    return localized;
  }
  return resolveTokenBankTransactionTitle(transaction, translate);
}

export type TokenBankRecordCategory =
  | 'usage'
  | 'recharge'
  | 'redeem'
  | 'refund'
  | 'other';

/** Classifies a transaction into a user-facing record category. */
export function classifyTokenBankTransaction(
  transaction: SdkworkWalletTransaction,
): TokenBankRecordCategory {
  const type = getTokenBankTransactionType(transaction);
  if (TOKEN_BANK_USAGE_TYPES.has(type)) {
    return 'usage';
  }
  if (type === 'token_bank_purchase_credit' || type === 'points_recharge') {
    return 'recharge';
  }
  if (type === 'refund') {
    return 'refund';
  }
  const haystack = [
    type,
    transaction.transactionTypeName,
    transaction.title,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/redeem|exchange|兑换/.test(haystack)) {
    return 'redeem';
  }
  if (/recharge|top.?up|充值/.test(haystack)) {
    return 'recharge';
  }
  return 'other';
}

export function matchesTokenBankRecordCategory(
  transaction: SdkworkWalletTransaction,
  category: TokenBankRecordCategory | 'all',
): boolean {
  if (category === 'all') {
    return true;
  }
  return classifyTokenBankTransaction(transaction) === category;
}

export function CloudRouterTokenBankTransactionList({
  limit,
  transactions,
}: CloudRouterTokenBankTransactionListProps) {
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
                <th className="px-5 py-3 font-medium">{t('console.tokenBank.transactions.businessType')}</th>
                <th className="px-5 py-3 font-medium">{t('console.tokenBank.name')}</th>
                <th className="px-5 py-3 font-medium">{t('console.recharge.records.table.status')}</th>
                <th className="px-5 py-3 font-medium sm:px-6">{t('console.recharge.records.table.time')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sdk-color-border-subtle)]">
              {visibleTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-5 py-3 font-medium text-[var(--sdk-color-text-primary)] sm:px-6">
                    {resolveTokenBankTransactionTitle(transaction, t)}
                  </td>
                  <td className="px-5 py-3 text-[var(--sdk-color-text-secondary)]">
                    {resolveTokenBankBusinessTypeName(transaction, t)}
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
