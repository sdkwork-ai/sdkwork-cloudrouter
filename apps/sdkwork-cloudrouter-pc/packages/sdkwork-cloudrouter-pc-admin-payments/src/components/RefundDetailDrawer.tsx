/**
 * Refund detail drawer.
 *
 * Fetches a single refund via the backend SDK retrieve operation and renders
 * its fields in a right-side drawer, mirroring the payment intent detail
 * drawer pattern. Amounts are backend integer minor units and are formatted
 * to yuan for display.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { Refund } from '@sdkwork/payment-backend-sdk';
import { backendPaymentRefundsRetrieve } from '../paymentsService';
import { formatRefundAmount, translateEnumValue } from '../forms/RefundDialogs';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';

interface RefundDetailDrawerProps {
  refundId: string | null;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  let text = value === null || value === undefined || value === '' ? '-' : String(value);
  // Backend timestamps are ISO 8601 (contain "T") — show them in local time.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      text = date.toLocaleString();
    }
  }
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-50 py-2 text-sm dark:border-white/5">
      <span className="shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-mono text-xs text-slate-900 dark:text-white">{text}</span>
    </div>
  );
}

export function RefundDetailDrawer({ refundId, onClose }: RefundDetailDrawerProps) {
  const { t } = useTranslation();
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
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('admin.commerce.payments.refunds.detail.title', 'Refund details')}</h2>
          <button
            aria-label={t('admin.commerce.payments.help.close', 'Close')}
            className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
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
              <DetailRow label={t('admin.commerce.payments.col.refundNo', 'Refund No')} value={refund.refundNo} />
              <DetailRow label={t('admin.col.order', 'Order')} value={refund.orderId} />
              <DetailRow label={t('admin.commerce.payments.col.paymentIntentId', 'Intent ID')} value={refund.paymentIntentId} />
              <DetailRow label={t('admin.commerce.payments.col.paymentAttemptId', 'Attempt ID')} value={refund.paymentAttemptId} />
              <DetailRow label={t('admin.col.provider', 'Provider')} value={refund.providerCode} />
              <DetailRow label={t('admin.col.account', 'Account')} value={refund.providerAccountId} />
              <DetailRow label={t('admin.col.amount', 'Amount')} value={`${formatRefundAmount(refund.amount, refund.currencyCode)} ${refund.currencyCode ?? ''}`} />
              <DetailRow label={t('admin.col.currency', 'Currency')} value={refund.currencyCode} />
              <DetailRow label={t('admin.col.status', 'Status')} value={translateEnumValue(t, 'status', refund.status)} />
              <DetailRow label={t('admin.commerce.payments.col.reasonCode', 'Reason')} value={translateEnumValue(t, 'reasonCode', refund.reasonCode)} />
              <DetailRow label={t('admin.commerce.payments.col.requestedByType', 'Requested By')} value={translateEnumValue(t, 'requestedByType', refund.requestedByType)} />
              <DetailRow label={t('admin.commerce.payments.col.requestedBy', 'Requester')} value={refund.requestedBy} />
              <DetailRow label={t('admin.col.created', 'Created')} value={refund.createdAt} />
              <DetailRow label={t('admin.col.updated', 'Updated')} value={refund.updatedAt} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
