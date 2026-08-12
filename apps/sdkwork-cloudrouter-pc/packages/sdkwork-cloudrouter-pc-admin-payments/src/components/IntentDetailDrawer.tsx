/**
 * Payment intent detail drawer.
 *
 * Fetches a single payment intent via the backend SDK retrieve operation and
 * renders its fields in a right-side drawer, mirroring the marketing admin
 * detail drawer pattern.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { PaymentIntent } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { backendPaymentIntentsRetrieve } from '../paymentsService';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';

interface IntentDetailDrawerProps {
  intentId: string | null;
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

export function IntentDetailDrawer({ intentId, onClose }: IntentDetailDrawerProps) {
  const { t } = useTranslation();
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!intentId) {
      setIntent(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setIntent(null);
    setError(null);
    void backendPaymentIntentsRetrieve(intentId)
      .then((value) => {
        if (!cancelled) {
          setIntent(value);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(resolveProblemMessage(loadError, t, t('admin.commerce.payments.intents.detail.loadError', 'Failed to load payment intent')));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [intentId, t]);

  if (!intentId) {
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
        aria-labelledby="payment-intent-detail-title"
        aria-modal="true"
        className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl dark:bg-[#181818]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white" id="payment-intent-detail-title">
            {t('admin.commerce.payments.intents.detail.title', 'Payment intent details')}
          </h2>
          <button
            aria-label={t('admin.commerce.payments.intents.detail.close', 'Close')}
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
          ) : intent === null ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.loading', 'Loading payment records...')}
            </div>
          ) : (
            <div>
              <DetailRow label={t('admin.commerce.payments.intents.detail.id', 'ID')} value={intent.id} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.paymentIntentNo', 'Intent No')} value={intent.paymentIntentNo} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.orderId', 'Order ID')} value={intent.orderId} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.ownerUserId', 'Owner User')} value={intent.ownerUserId} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.paymentMethod', 'Payment Method')} value={intent.paymentMethod} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.providerCode', 'Provider')} value={intent.providerCode} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.amount', 'Amount')} value={intent.amount} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.currencyCode', 'Currency')} value={intent.currencyCode} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.status', 'Status')} value={formatIntentStatus(t, intent.status)} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.createdAt', 'Created')} value={intent.createdAt} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.updatedAt', 'Updated')} value={intent.updatedAt} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatIntentStatus(t: ReturnType<typeof useTranslation>['t'], value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const raw = String(value);
  return t(`admin.commerce.payments.value.status.${raw}`, { defaultValue: raw });
}
