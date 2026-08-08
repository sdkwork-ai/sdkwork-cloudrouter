import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toDataURL } from 'qrcode';
import { CheckCircle2, Loader2, QrCode, RotateCcw, X } from 'lucide-react';
import type { TestPayment } from '@sdkwork/payment-backend-sdk';
import {
  readAdminResourceRecordList,
  resolveProblemMessage,
  type AdminResourceRecord,
} from '@sdkwork/cloudroutes-pc-commons';
import { getCloudRouterPaymentBackendService } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import {
  backendPaymentDevSandboxTrigger,
  backendPaymentDevTestPayment,
  backendPaymentsAttemptsList,
} from '../paymentsService';

export interface PaymentTestDialogProps {
  record: AdminResourceRecord;
  onClose: () => void;
}

const PAYMENT_STATUS_POLL_INTERVAL_MS = 3000;
const SUCCEEDED_PAYMENT_STATUSES = new Set(['succeeded', 'success']);
const FAILED_PAYMENT_STATUSES = new Set(['failed', 'closed', 'canceled', 'cancelled', 'expired', 'timeout']);

/**
 * One-cent test payment dialog. Creates a 0.01 test payment through the
 * backend dev endpoint, renders the scan-to-pay QR code, polls the payment
 * attempt status, and offers a sandbox success-callback simulation for
 * development/sandbox provider accounts.
 */
export function PaymentTestDialog({ record, onClose }: PaymentTestDialogProps) {
  const { t } = useTranslation();
  const methodKey = String(record.methodKey ?? '');
  const currencyCode = String(record.currencyCode ?? 'CNY');
  const [testPayment, setTestPayment] = useState<TestPayment | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<'creating' | 'ready' | 'succeeded' | 'failed'>('creating');
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulateNotice, setSimulateNotice] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [createAttempt, setCreateAttempt] = useState(0);
  const createSequenceRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    const sequence = createSequenceRef.current + 1;
    createSequenceRef.current = sequence;
    setTestPayment(null);
    setQrImageUrl(null);
    setPhase('creating');
    setError(null);
    setSimulateNotice(null);
    setRemainingSeconds(null);

    void backendPaymentDevTestPayment({ methodKey, amount: '0.01', currencyCode })
      .then((payment) => {
        if (!mounted || createSequenceRef.current !== sequence) {
          return;
        }
        setTestPayment(payment);
        setPhase('ready');
        if (payment.qrCodeUrl) {
          void toDataURL(payment.qrCodeUrl, { errorCorrectionLevel: 'M', margin: 1, width: 252 })
            .then((value) => {
              if (mounted && createSequenceRef.current === sequence) {
                setQrImageUrl(value);
              }
            })
            .catch(() => {
              if (mounted && createSequenceRef.current === sequence) {
                setError(t('admin.commerce.payments.methods.testPayment.error.noQrCode'));
              }
            });
        } else {
          setError(t('admin.commerce.payments.methods.testPayment.error.noQrCode'));
        }
      })
      .catch((cause: unknown) => {
        if (!mounted || createSequenceRef.current !== sequence) {
          return;
        }
        setError(resolveProblemMessage(cause, t, t('admin.commerce.payments.methods.testPayment.error.create')));
        setPhase('failed');
      });

    return () => {
      mounted = false;
    };
  }, [createAttempt, currencyCode, methodKey, t]);

  // Expiry countdown from the provider checkout expiration.
  useEffect(() => {
    if (phase !== 'ready' || !testPayment?.expiresAt) {
      setRemainingSeconds(null);
      return undefined;
    }
    const target = Date.parse(testPayment.expiresAt);
    if (!Number.isFinite(target)) {
      return undefined;
    }
    const update = () => setRemainingSeconds(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [phase, testPayment?.expiresAt]);

  // Poll the payment attempt until it leaves the pending state.
  useEffect(() => {
    if (phase !== 'ready' || !testPayment) {
      return undefined;
    }
    const paymentIntentId = testPayment.paymentIntentId;
    let active = true;

    const poll = async () => {
      try {
        const page = await backendPaymentsAttemptsList({ paymentIntentId });
        if (!active) {
          return;
        }
        const attempt = page.items.find((item) => item.paymentIntentId === paymentIntentId);
        if (!attempt) {
          return;
        }
        const status = String(attempt.status ?? '');
        if (SUCCEEDED_PAYMENT_STATUSES.has(status)) {
          setPhase('succeeded');
        } else if (FAILED_PAYMENT_STATUSES.has(status)) {
          setPhase('failed');
        }
      } catch {
        // A transient status request keeps the QR code visible.
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), PAYMENT_STATUS_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [phase, testPayment]);

  async function simulateSuccessCallback() {
    if (!testPayment || simulating) {
      return;
    }
    setSimulating(true);
    setSimulateNotice(null);
    setError(null);
    try {
      const accounts = readAdminResourceRecordList(await getCloudRouterPaymentBackendService().providerAccounts.list());
      const devAccounts = accounts.filter((account) => {
        const environment = String(account.environment ?? '');
        return environment === 'development' || environment === 'sandbox';
      });
      const preferred = devAccounts.find((account) => (
        String(account.providerCode ?? '') === testPayment.providerCode
      )) ?? devAccounts[0];
      const accountId = preferred ? String(preferred.id ?? '') : '';
      if (!accountId) {
        setError(t(
          'admin.commerce.payments.sandboxTrigger.error.noAccount',
          'No development or sandbox provider account found. Create one in the provider accounts workspace first.',
        ));
        return;
      }
      await backendPaymentDevSandboxTrigger({
        providerAccountId: accountId,
        eventType: 'sdkwork.sandbox.triggered',
        amount: testPayment.amount,
        currencyCode: testPayment.currencyCode,
        outTradeNo: testPayment.outTradeNo,
      });
      setSimulateNotice(t('admin.commerce.payments.methods.testPayment.simulateDone'));
    } catch (cause) {
      setError(resolveProblemMessage(cause, t, t('admin.commerce.payments.sandboxTrigger.error', 'Sandbox callback could not be enqueued.')));
    } finally {
      setSimulating(false);
    }
  }

  function formatRemainingTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  const isExpired = phase === 'ready' && remainingSeconds !== null && remainingSeconds === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        aria-labelledby="payment-test-dialog-title"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#181818]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white" id="payment-test-dialog-title">
              {t('admin.commerce.payments.methods.testPayment.title', 'One-cent test payment')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('admin.commerce.payments.methods.testPayment.desc', 'Create a 0.01 test payment for {{methodKey}} and scan the QR code with a mobile payment app to verify the full payment flow end to end.', { methodKey })}
            </p>
          </div>
          <button
            aria-label={t('admin.commerce.payments.dialog.close', 'Close')}
            className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-[16rem] p-5">
          {error && phase === 'failed' && !testPayment ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</div>
              <button
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={() => setCreateAttempt((value) => value + 1)}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                {t('admin.commerce.payments.methods.testPayment.retry', 'Create again')}
              </button>
            </div>
          ) : null}

          {phase === 'creating' ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {t('admin.commerce.payments.methods.testPayment.creating', 'Creating payment QR code...')}
              </div>
            </div>
          ) : null}

          {phase === 'ready' && testPayment ? (
            <div className="flex flex-col items-center gap-4">
              <div className="grid w-full gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-white/5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t('admin.commerce.payments.methods.testPayment.amount', 'Amount')}</span>
                  <div className="mt-0.5 font-medium text-slate-900 dark:text-white">
                    {testPayment.currencyCode} {testPayment.amount}
                  </div>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-white/5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t('admin.commerce.payments.methods.testPayment.method', 'Payment method')}</span>
                  <div className="mt-0.5 font-medium text-slate-900 dark:text-white">{methodKey}</div>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-white/5 sm:col-span-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{t('admin.commerce.payments.methods.testPayment.outTradeNo', 'Out trade no')}</span>
                  <div className="mt-0.5 break-all font-medium text-slate-900 dark:text-white">{testPayment.outTradeNo}</div>
                </div>
              </div>

              {qrImageUrl && !isExpired ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    alt={t('admin.commerce.payments.methods.testPayment.scanPrompt', 'Scan the QR code to pay')}
                    className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10"
                    src={qrImageUrl}
                  />
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('admin.commerce.payments.methods.testPayment.scanPrompt', 'Scan the QR code to pay')}
                  </div>
                  {remainingSeconds !== null ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400" role="timer">
                      {t('admin.commerce.payments.methods.testPayment.expiresIn', 'Order remaining time')}: {formatRemainingTime(remainingSeconds)}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="grid h-64 w-64 place-items-center rounded-lg border border-dashed border-slate-300 dark:border-white/15">
                    <QrCode className="h-8 w-8 text-slate-400" />
                  </div>
                  {isExpired ? (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {t('admin.commerce.payments.methods.testPayment.expired', 'QR code expired')}
                      {' · '}
                      {t('admin.commerce.payments.methods.testPayment.expiredDesc', 'The test payment has expired. Create a new one to continue.')}
                    </div>
                  ) : null}
                  {error ? (
                    <div className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</div>
                  ) : null}
                </div>
              )}

              {simulateNotice ? (
                <div className="text-sm text-emerald-600 dark:text-emerald-400" role="status">{simulateNotice}</div>
              ) : null}
            </div>
          ) : null}

          {phase === 'succeeded' ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {t('admin.commerce.payments.methods.testPayment.success', 'Payment succeeded, test passed.')}
              </div>
            </div>
          ) : null}

          {phase === 'failed' && testPayment ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error ?? t('admin.commerce.payments.methods.testPayment.failed', 'Payment failed.')}
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={() => setCreateAttempt((value) => value + 1)}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                {t('admin.commerce.payments.methods.testPayment.retry', 'Create again')}
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10">
          {phase === 'ready' && testPayment && !isExpired ? (
            <button
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              disabled={simulating}
              onClick={() => void simulateSuccessCallback()}
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              {simulating ? t('admin.commerce.payments.dialog.saving', 'Saving...') : t('admin.commerce.payments.methods.testPayment.simulate', 'Simulate success callback')}
            </button>
          ) : null}
          <button
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            onClick={onClose}
            type="button"
          >
            {t('admin.commerce.payments.methods.testPayment.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
