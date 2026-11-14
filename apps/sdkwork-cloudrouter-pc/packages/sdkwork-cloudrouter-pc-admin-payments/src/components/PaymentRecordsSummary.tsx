import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminResourceListQuery } from '@sdkwork/cloudroutes-pc-commons';
import {
  backendPaymentRecordsSummary,
  backendRefundRecordsSummary,
  type PaymentRecordsSummaryData,
  type RefundRecordsSummaryData,
} from '../paymentsService';
import { formatPaymentAmount } from '../paymentMoney';
import { formatPaymentEnumValue } from '../paymentFormat';
import { buildPaymentRecordListQuery, buildRefundListQuery } from '../services/paymentRecordsQuery';

/**
 * Aggregate strip for the payment record and refund record consoles.
 *
 * The figures come from the backend summary endpoint, not from the loaded page:
 * a page-local sum would understate totals as soon as a filter narrows the list.
 * The strip re-fetches whenever the committed query changes and keeps the last
 * good result visible while the next one loads.
 */

export type PaymentRecordsSummaryProps = {
  kind: 'paymentRecords' | 'refunds';
  query: AdminResourceListQuery;
};

type SummaryState = {
  data: PaymentRecordsSummaryData | RefundRecordsSummaryData | null;
  failed: boolean;
};

export function PaymentRecordsSummary({ kind, query }: PaymentRecordsSummaryProps) {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<SummaryState>({ data: null, failed: false });

  // Identity of the effective query. `query` is rebuilt on every render, so the
  // fetch effect keys on this serialized signature instead of object identity.
  const querySignature = useMemo(
    () => JSON.stringify({ kind, filters: query.filters, search: query.search ?? '' }),
    [kind, query.filters, query.search],
  );

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ data: current.data, failed: false }));
    const request = kind === 'paymentRecords'
      ? backendPaymentRecordsSummary(buildPaymentRecordListQuery(query))
      : backendRefundRecordsSummary(buildRefundListQuery(query));
    void request
      .then((data) => {
        if (!cancelled) {
          setState({ data, failed: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ data: null, failed: true });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the signature captures every input
  }, [querySignature]);

  const data = state.data;
  const totalCount = data ? Number(data.totalCount) : null;
  const formatCount = (value: number | null) => (
    value === null || Number.isNaN(value) ? '-' : value.toLocaleString(i18n.language)
  );

  return (
    <div
      aria-busy={!data && !state.failed}
      className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm"
      data-testid="payment-records-summary"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('admin.commerce.payments.summary.records', 'Records')}
        </span>
        <span className="font-mono text-base font-semibold text-slate-900 dark:text-white">
          {formatCount(totalCount)}
        </span>
      </div>

      {(data?.totalAmounts ?? []).map((bucket) => (
        <div className="flex items-baseline gap-2" key={`amount-${bucket.currencyCode}`}>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('admin.commerce.payments.summary.amount', 'Amount')}
            {bucket.currencyCode ? ` (${bucket.currencyCode})` : ''}
          </span>
          <span className="font-mono text-base font-semibold text-slate-900 dark:text-white">
            {formatPaymentAmount(bucket.amount, bucket.currencyCode, i18n.language)}
          </span>
        </div>
      ))}

      {(data?.statusCounts ?? [])
        .filter((bucket) => Number(bucket.count) > 0)
        .slice(0, 5)
        .map((bucket) => (
          <div className="flex items-baseline gap-2" key={`status-${bucket.status}`}>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {formatPaymentEnumValue(t, 'admin.commerce.payments.value.status', bucket.status)}
            </span>
            <span className="font-mono text-base font-semibold text-slate-900 dark:text-white">
              {formatCount(Number(bucket.count))}
            </span>
          </div>
        ))}

      {state.failed ? (
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300" role="status">
          {t('admin.commerce.payments.summary.loadError', 'Summary is unavailable.')}
        </span>
      ) : null}
    </div>
  );
}
