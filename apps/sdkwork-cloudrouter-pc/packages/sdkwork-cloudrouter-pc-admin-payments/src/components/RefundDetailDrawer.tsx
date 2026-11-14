/**
 * Refund detail drawer.
 *
 * Fetches a single refund through the backend SDK retrieve operation. The
 * amount is an integer minor-unit string, shown through the shared currency
 * formatter so it can never disagree with the refund list or the intent drawer.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { CopyButton, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import type { Refund } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { backendPaymentRefundsRetrieve } from '../paymentsService';
import { formatPaymentDateTime, formatPaymentEnumValue } from '../paymentFormat';
import { formatPaymentAmount } from '../paymentMoney';
import { DetailRow } from './DetailRow';
import { PaymentStatusPill } from './PaymentStatusPill';

interface RefundDetailDrawerProps {
  refundId: string | null;
  onClose: () => void;
}

export function RefundDetailDrawer({ refundId, onClose }: RefundDetailDrawerProps) {
  const { t, i18n } = useTranslation();
  const [refund, setRefund] = useState<Refund | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!refundId) {
      setRefund(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setRefund(null);
    setError(null);
    void backendPaymentRefundsRetrieve(refundId)
      .then((value) => {
        if (!cancelled) {
          setRefund(value);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(resolveProblemMessage(loadError, t, t('admin.commerce.payments.refunds.detail.loadError', 'Failed to load refund')));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refundId, t]);

  if (!refundId) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-label={t('admin.commerce.payments.refunds.detail.title', 'Refund details')}
        aria-modal="true"
        className="flex h-full w-full max-w-md flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white">
              {t('admin.commerce.payments.refunds.detail.title', 'Refund details')}
            </h2>
            {refund?.refundNo ? (
              <p className="mt-0.5 truncate font-mono text-xs text-slate-500 dark:text-slate-400">{refund.refundNo}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {refund ? (
              <CopyButton
                copiedLabel={t('admin.commerce.payments.detail.copied', 'Copied')}
                label={t('admin.commerce.payments.detail.copy', 'Copy')}
                text={String(refund.refundNo ?? refund.id ?? '')}
              />
            ) : null}
            <button
              aria-label={t('admin.commerce.payments.help.close', 'Close')}
              className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" role="alert">
              {error}
            </div>
          ) : refund === null ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.loading', 'Loading payment records...')}
            </div>
          ) : (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <PaymentStatusPill status={refund.status} />
                <span className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
                  {formatPaymentAmount(refund.amount, refund.currencyCode, i18n.language)}
                </span>
              </div>
              <DetailRow label={t('admin.col.order', 'Order')} value={refund.orderId} />
              <DetailRow label={t('admin.commerce.payments.col.paymentIntentId', 'Intent ID')} value={refund.paymentIntentId} />
              <DetailRow label={t('admin.commerce.payments.col.paymentAttemptId', 'Attempt ID')} value={refund.paymentAttemptId} />
              <DetailRow label={t('admin.col.provider', 'Provider')} value={refund.providerCode} />
              <DetailRow label={t('admin.col.account', 'Account')} value={refund.providerAccountId} />
              <DetailRow label={t('admin.col.currency', 'Currency')} value={refund.currencyCode} />
              <DetailRow label={t('admin.commerce.payments.col.reasonCode', 'Reason')} value={formatPaymentEnumValue(t, 'admin.commerce.payments.value.reasonCode', refund.reasonCode)} />
              <DetailRow label={t('admin.commerce.payments.col.requestedByType', 'Requested By')} value={formatPaymentEnumValue(t, 'admin.commerce.payments.value.requestedByType', refund.requestedByType)} />
              <DetailRow label={t('admin.commerce.payments.col.requestedBy', 'Requester')} value={refund.requestedBy} />

              <section aria-labelledby="payment-refund-lifecycle-title" className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white" id="payment-refund-lifecycle-title">
                  {t('admin.commerce.payments.refunds.detail.lifecycle', 'Refund lifecycle')}
                </h3>
                <ol className="space-y-3 border-l border-slate-200 pl-4 dark:border-white/10">
                  <li className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-white/20" />
                    <div className="text-xs font-medium text-slate-900 dark:text-white">
                      {t('admin.commerce.payments.refunds.detail.submittedAt', 'Submitted')}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{formatPaymentDateTime(refund.createdAt)}</div>
                  </li>
                  <li className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-lobster-500" />
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-900 dark:text-white">
                      {t('admin.commerce.payments.refunds.detail.lastUpdatedAt', 'Last update')}
                      <PaymentStatusPill status={refund.status} />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{formatPaymentDateTime(refund.updatedAt)}</div>
                  </li>
                </ol>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
