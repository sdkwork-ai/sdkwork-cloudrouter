/**
 * Payment intent (payment record) detail drawer.
 *
 * Fetches the intent through the backend SDK retrieve operation and, in
 * parallel, the attempts and refunds that belong to it. A finance operator
 * investigating a payment needs all three in one place: the intent says what
 * was charged, the attempts say how the provider call went, and the refunds say
 * what was given back.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import {
  CopyButton,
  readAdminResourceRecordList,
  resolveProblemMessage,
} from '@sdkwork/cloudroutes-pc-commons';
import type { PaymentIntent } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import {
  backendPaymentIntentsRetrieve,
  backendPaymentsAttemptsList,
  backendPaymentsRefundsList,
} from '../paymentsService';
import { formatPaymentDateTime, formatPaymentEnumValue } from '../paymentFormat';
import { formatPaymentAmount } from '../paymentMoney';
import { DetailRow } from './DetailRow';
import { PaymentStatusPill } from './PaymentStatusPill';

interface IntentDetailDrawerProps {
  intentId: string | null;
  onClose: () => void;
}

type RelatedRecord = Record<string, unknown>;

type RelatedState = {
  attempts: RelatedRecord[];
  refunds: RelatedRecord[];
  loading: boolean;
  error: string | null;
};

const EMPTY_RELATED: RelatedState = { attempts: [], refunds: [], loading: false, error: null };

export function IntentDetailDrawer({ intentId, onClose }: IntentDetailDrawerProps) {
  const { t, i18n } = useTranslation();
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [related, setRelated] = useState<RelatedState>(EMPTY_RELATED);

  useEffect(() => {
    if (!intentId) {
      setIntent(null);
      setError(null);
      setRelated(EMPTY_RELATED);
      return;
    }
    let cancelled = false;
    setIntent(null);
    setError(null);
    setRelated({ ...EMPTY_RELATED, loading: true });
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
    // 关联记录（尝试 / 退款）失败不阻断主记录展示，只在抽屉内提示。
    void Promise.all([
      backendPaymentsAttemptsList({ paymentIntentId: intentId, pageSize: 100 }),
      backendPaymentsRefundsList({ paymentIntentId: intentId, pageSize: 100 }),
    ])
      .then(([attempts, refunds]) => {
        if (!cancelled) {
          setRelated({
            attempts: readAdminResourceRecordList(attempts),
            refunds: readAdminResourceRecordList(refunds),
            loading: false,
            error: null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRelated({
            attempts: [],
            refunds: [],
            loading: false,
            error: t('admin.commerce.payments.intents.detail.relatedError', 'Related attempts and refunds could not be loaded.'),
          });
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
        className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-[#181818]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white" id="payment-intent-detail-title">
              {t('admin.commerce.payments.intents.detail.title', 'Payment record details')}
            </h2>
            {intent?.paymentIntentNo ? (
              <p className="mt-0.5 truncate font-mono text-xs text-slate-500 dark:text-slate-400">{intent.paymentIntentNo}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {intent ? (
              <CopyButton
                copiedLabel={t('admin.commerce.payments.detail.copied', 'Copied')}
                label={t('admin.commerce.payments.detail.copy', 'Copy')}
                text={String(intent.paymentIntentNo ?? intent.id ?? '')}
              />
            ) : null}
            <button
              aria-label={t('admin.commerce.payments.intents.detail.close', 'Close')}
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
          ) : intent === null ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.loading', 'Loading payment records...')}
            </div>
          ) : (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <PaymentStatusPill status={intent.status} />
                <span className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
                  {formatPaymentAmount(intent.amount, intent.currencyCode, i18n.language)}
                </span>
              </div>
              <DetailRow label={t('admin.commerce.payments.intents.detail.id', 'ID')} value={intent.id} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.orderId', 'Order ID')} value={intent.orderId} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.ownerUserId', 'Owner User')} value={intent.ownerUserId} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.paymentMethod', 'Payment Method')} value={intent.paymentMethod} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.providerCode', 'Provider')} value={intent.providerCode} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.amount', 'Amount')} value={formatPaymentAmount(intent.amount, intent.currencyCode, i18n.language)} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.currencyCode', 'Currency')} value={intent.currencyCode} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.createdAt', 'Created')} value={formatPaymentDateTime(intent.createdAt)} />
              <DetailRow label={t('admin.commerce.payments.intents.detail.updatedAt', 'Updated')} value={formatPaymentDateTime(intent.updatedAt)} />

              <section aria-labelledby="payment-intent-attempts-title" className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white" id="payment-intent-attempts-title">
                  {t('admin.commerce.payments.intents.detail.attempts', 'Payment attempts')}
                </h3>
                {related.loading ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('admin.commerce.payments.intents.detail.relatedLoading', 'Loading related records...')}</p>
                ) : related.error ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">{related.error}</p>
                ) : related.attempts.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('admin.commerce.payments.intents.detail.noAttempts', 'No attempts recorded.')}</p>
                ) : (
                  <ul className="space-y-2">
                    {related.attempts.map((attempt) => (
                      <li className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-white/10" key={String(attempt.id ?? attempt.attemptNo ?? '')}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 break-all font-mono text-slate-900 dark:text-white">{String(attempt.attemptNo ?? attempt.id ?? '-')}</span>
                          <PaymentStatusPill status={attempt.status} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
                          <span className="break-all font-mono">{String(attempt.providerTransactionId ?? attempt.outTradeNo ?? '-')}</span>
                          <span className="font-mono">{formatPaymentAmount(attempt.amount, attempt.currencyCode, i18n.language)}</span>
                        </div>
                        <div className="mt-1 text-slate-400 dark:text-slate-500">
                          {t('admin.col.paid', 'Paid')}: {formatPaymentDateTime(attempt.paidAt)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="payment-intent-refunds-title" className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white" id="payment-intent-refunds-title">
                  {t('admin.commerce.payments.intents.detail.refunds', 'Refunds')}
                </h3>
                {related.loading ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('admin.commerce.payments.intents.detail.relatedLoading', 'Loading related records...')}</p>
                ) : related.refunds.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('admin.commerce.payments.intents.detail.noRefunds', 'No refunds recorded.')}</p>
                ) : (
                  <ul className="space-y-2">
                    {related.refunds.map((refund) => (
                      <li className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-white/10" key={String(refund.id ?? refund.refundNo ?? '')}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 break-all font-mono text-slate-900 dark:text-white">{String(refund.refundNo ?? refund.id ?? '-')}</span>
                          <PaymentStatusPill status={refund.status} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
                          <span>{formatPaymentEnumValue(t, 'admin.commerce.payments.value.reasonCode', refund.reasonCode)}</span>
                          <span className="font-mono">{formatPaymentAmount(refund.amount, refund.currencyCode, i18n.language)}</span>
                        </div>
                        <div className="mt-1 text-slate-400 dark:text-slate-500">{formatPaymentDateTime(refund.createdAt)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
