import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toDataURL } from 'qrcode';
import { loadStripe, type Stripe, type StripeCardElement } from '@stripe/stripe-js';
import { CheckCircle2, CreditCard, ExternalLink, Loader2, QrCode, RefreshCw, RotateCcw, X } from 'lucide-react';
import type { TestPayment } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import {
  readAdminResourceRecordList,
  resolveProblemMessage,
  type AdminResourceRecord,
} from '@sdkwork/cloudroutes-pc-commons';
import { getCloudRouterPaymentBackendService } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import {
  backendPaymentDevCheckAttemptStatus,
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

type TestPaymentTranslate = ReturnType<typeof useTranslation>['t'];

/**
 * Appends operator-facing guidance when the backend diagnostic carries a
 * configuration-issue keyword, so zh-CN admins see actionable steps next to
 * the raw English detail instead of having to decode it.
 */
function enrichTestPaymentError(detail: string, t: TestPaymentTranslate): string {
  if (detail.includes('is inactive')) {
    return `${detail}
${t('admin.commerce.payments.methods.testPayment.guide.inactiveAccount', '→ 请前往 支付中心 → 机构账户 → 编辑对应账户 → 配置真实或 PSP 沙箱凭据 → 点 Test 校验 → 通过后启用，再重新测试。')}`;
  }
  if (detail.includes('has no provider account bound') || detail.includes('no channel')) {
    return `${detail}
${t('admin.commerce.payments.methods.testPayment.guide.noChannel', '→ 请前往 支付中心 → 支付通道 → 为该支付方式创建并启用通道（绑定已启用的机构账户）。')}`;
  }
  if (detail.includes('is not configured')) {
    return `${detail}
${t('admin.commerce.payments.methods.testPayment.guide.notConfigured', '→ 请前往 支付中心 → 机构账户 → 创建并启用对应 PSP 账户（真实或沙箱凭据）。')}`;
  }
  if (detail.includes('storage failed')) {
    return `${detail}
${t('admin.commerce.payments.methods.testPayment.guide.storage', '→ 数据库结构问题：请核对部署库的 payment/order 表结构（缺列或类型不符）。')}`;
  }
  if (detail.includes('SIGN_ERROR') || detail.includes('签名')) {
    return `${detail}
${t('admin.commerce.payments.methods.testPayment.guide.signError', '→ 请求已真实到达支付网关，是网关拒绝签名：当前账户用的是自动填充的测试凭据，不是真实商户密钥。请前往 支付中心 → 机构账户 → 编辑对应账户 → 填入真实商户 API 私钥/证书（微信商户平台获取）→ 保存后重试；HTTP 401 来自微信网关，不是登录问题，你的会话正常。')}`;
  }
  if (detail.includes('401') || detail.includes('Unauthorized') || detail.includes('Invalid API Key')) {
    return `${detail}
${t('admin.commerce.payments.methods.testPayment.guide.auth401', '→ HTTP 401 来自支付网关（凭据被拒绝），不是本系统登录问题，你的会话正常。请前往 支付中心 → 机构账户 → 编辑对应账户 → 填入真实或沙箱凭据 → 保存后重试。')}`;
  }
  return detail;
}

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
  const [checking, setChecking] = useState(false);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [stripeCardElement, setStripeCardElement] = useState<StripeCardElement | null>(null);
  const [payingCard, setPayingCard] = useState(false);
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
        } else if (!payment.payUrl && !payment.payForm && !payment.clientSecret && String(payment.providerCode ?? '') !== 'sandbox') {
          setError(t('admin.commerce.payments.methods.testPayment.error.noSurface'));
        }
      })
      .catch((cause: unknown) => {
        if (!mounted || createSequenceRef.current !== sequence) {
          return;
        }
        setError(enrichTestPaymentError(resolveProblemMessage(cause, t, t('admin.commerce.payments.methods.testPayment.error.create')), t));
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

  // Load Stripe.js when the test payment carries a client secret, then mount
  // the card element for Stripe methods.
  useEffect(() => {
    if (!testPayment?.clientSecret || !testPayment.publishableKey || stripe) {
      return undefined;
    }
    let active = true;
    void loadStripe(testPayment.publishableKey)
      .then((instance) => {
        if (active && instance) {
          setStripe(instance);
        }
      })
      .catch(() => {
        if (active) {
          setError(t('admin.commerce.payments.methods.testPayment.error.stripeLoad', 'Stripe could not be loaded. Check the publishable key configuration.'));
        }
      });
    return () => {
      active = false;
    };
  }, [stripe, t, testPayment?.clientSecret, testPayment?.publishableKey]);

  async function payWithCard() {
    if (!stripe || !stripeCardElement || !testPayment?.clientSecret || payingCard) {
      return;
    }
    setPayingCard(true);
    setError(null);
    setSimulateNotice(null);
    try {
      const result = await stripe.confirmCardPayment(testPayment.clientSecret, {
        payment_method: { card: stripeCardElement },
      });
      if (result.error) {
        setError(resolveProblemMessage(
          result.error,
          t,
          t('admin.commerce.payments.methods.testPayment.error.cardDeclined', 'The card payment could not be completed.'),
        ));
        return;
      }
      const intentStatus = String(result.paymentIntent?.status ?? '');
      if (SUCCEEDED_PAYMENT_STATUSES.has(intentStatus)) {
        setSimulateNotice(t('admin.commerce.payments.methods.testPayment.cardPaid', 'Card payment succeeded. Confirming with the payment channel...'));
        // Confirm through the channel so the local attempt status updates
        // through the same status machine as the webhook path.
        await checkProviderStatus();
        return;
      }
      setError(t('admin.commerce.payments.methods.testPayment.cardPending', 'The card payment was submitted. Use "Check payment channel status" after the channel confirms it.'));
    } catch (cause) {
      setError(resolveProblemMessage(cause, t, t('admin.commerce.payments.methods.testPayment.error.card', 'The card payment could not be completed.')));
    } finally {
      setPayingCard(false);
    }
  }

  async function checkProviderStatus() {
    if (!testPayment || checking) {
      return;
    }
    setChecking(true);
    setError(null);
    setSimulateNotice(null);
    try {
      const result = await backendPaymentDevCheckAttemptStatus({
        paymentIntentId: testPayment.paymentIntentId,
      });
      if (result.paid) {
        setPhase('succeeded');
        return;
      }
      const status = String(result.localStatus ?? '');
      if (FAILED_PAYMENT_STATUSES.has(status)) {
        setPhase('failed');
        return;
      }
      setError(t(
        'admin.commerce.payments.methods.testPayment.checkPending',
        'The payment channel has not confirmed the payment yet. Complete the scan/redirect payment first, then check again.',
      ));
    } catch (cause) {
      setError(enrichTestPaymentError(resolveProblemMessage(cause, t, t('admin.commerce.payments.methods.testPayment.error.check', 'The payment channel status could not be checked.')), t));
    } finally {
      setChecking(false);
    }
  }

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

  function openPayUrl(url: string) {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      setError(t('admin.commerce.payments.methods.testPayment.error.popupBlocked'));
    }
  }

  /** Renders the Alipay cashier form in a new window and auto-submits it. */
  /**
   * Renders the Alipay cashier form in a new window and auto-submits it.
   * The form is rebuilt from the parsed action/method/inputs instead of
   * writing the raw HTML, so no script/style markup from the payload can
   * ever execute in the opened window.
   */
  function submitPayForm(form: string) {
    const opened = window.open('', '_blank', 'noopener,noreferrer');
    if (!opened) {
      setError(t('admin.commerce.payments.methods.testPayment.error.popupBlocked'));
      return;
    }
    const document = opened.document;
    document.open();
    const parsed = new DOMParser().parseFromString(form, 'text/html');
    const source = parsed.querySelector('form');
    const target = document.createElement('form');
    if (source) {
      target.action = source.getAttribute('action') ?? '';
      target.method = source.getAttribute('method') ?? 'post';
      source.querySelectorAll('input').forEach((input) => {
        const clone = document.createElement('input');
        clone.type = input.getAttribute('type') ?? 'text';
        clone.name = input.getAttribute('name') ?? '';
        clone.value = input.getAttribute('value') ?? '';
        target.appendChild(clone);
      });
    }
    document.body.appendChild(target);
    document.close();
    target.submit();
  }

  const isExpired = phase === 'ready' && remainingSeconds !== null && remainingSeconds === 0;
  const hasQrSurface = Boolean(qrImageUrl);
  const hasJumpSurface = Boolean(testPayment?.payUrl || testPayment?.payForm);
  const hasCardSurface = Boolean(testPayment?.clientSecret);
  const isSandbox = String(testPayment?.providerCode ?? '') === 'sandbox';

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
              {t('admin.commerce.payments.methods.testPayment.desc', 'Create a 0.01 test payment for {{methodKey}} and scan the QR code or open the provider cashier page to verify the full payment flow end to end.', { methodKey })}
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
              ) : null}

              {hasJumpSurface && !isExpired ? (
                <div className="flex w-full flex-col items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('admin.commerce.payments.methods.testPayment.jumpTitle', 'Pay on the web cashier')}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t('admin.commerce.payments.methods.testPayment.jumpDesc', 'Open the provider payment page in a new window and pay {{amount}} {{currencyCode}} to verify the flow.', {
                      amount: testPayment?.amount ?? '0.01',
                      currencyCode: testPayment?.currencyCode ?? currencyCode,
                    })}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {testPayment?.payUrl ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        onClick={() => openPayUrl(String(testPayment.payUrl))}
                        type="button"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t('admin.commerce.payments.methods.testPayment.jumpOpen', 'Open payment page')}
                      </button>
                    ) : null}
                    {testPayment?.payForm ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        onClick={() => submitPayForm(String(testPayment.payForm))}
                        type="button"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t('admin.commerce.payments.methods.testPayment.jumpSubmitForm', 'Open payment page')}
                      </button>
                    ) : null}
                  </div>
                  {remainingSeconds !== null ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400" role="timer">
                      {t('admin.commerce.payments.methods.testPayment.expiresIn', 'Order remaining time')}: {formatRemainingTime(remainingSeconds)}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isSandbox && !isExpired ? (
                <div className="flex w-full flex-col items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {t('admin.commerce.payments.methods.testPayment.sandboxTitle', 'Local sandbox simulation')}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t('admin.commerce.payments.methods.testPayment.sandboxDesc', 'The sandbox has no real PSP checkout. Simulate a successful payment to verify the full flow (order gateway → payment status → reconciliation).')}
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={simulating}
                    onClick={() => void simulateSuccessCallback()}
                    type="button"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {simulating ? t('admin.commerce.payments.dialog.saving', 'Saving...') : t('admin.commerce.payments.methods.testPayment.sandboxSimulate', 'Simulate payment success')}
                  </button>
                  {remainingSeconds !== null ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400" role="timer">
                      {t('admin.commerce.payments.methods.testPayment.expiresIn', 'Order remaining time')}: {formatRemainingTime(remainingSeconds)}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {hasCardSurface && !isExpired ? (
                <div className="flex w-full flex-col items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <CreditCard className="h-4 w-4" />
                    {t('admin.commerce.payments.methods.testPayment.cardTitle', 'Pay with card')}
                  </div>
                  <div className="w-full max-w-sm">
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-[#202020]">
                      {stripe ? (
                        <StripeCardElementWrapper
                          onReady={(element) => setStripeCardElement(element)}
                          stripe={stripe}
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('admin.commerce.payments.methods.testPayment.cardLoading', 'Loading card form...')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t('admin.commerce.payments.methods.testPayment.cardHint', 'Test mode: use card 4242 4242 4242 4242, any future expiry and CVC.')}
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!stripe || !stripeCardElement || payingCard}
                    onClick={() => void payWithCard()}
                    type="button"
                  >
                    <CreditCard className="h-4 w-4" />
                    {payingCard ? t('admin.commerce.payments.dialog.saving', 'Saving...') : t('admin.commerce.payments.methods.testPayment.cardPay', 'Pay 0.01')}
                  </button>
                  {remainingSeconds !== null ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400" role="timer">
                      {t('admin.commerce.payments.methods.testPayment.expiresIn', 'Order remaining time')}: {formatRemainingTime(remainingSeconds)}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!hasQrSurface && !hasJumpSurface && !hasCardSurface && !isSandbox ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="grid h-64 w-64 place-items-center rounded-lg border border-dashed border-slate-300 dark:border-white/15">
                    <QrCode className="h-8 w-8 text-slate-400" />
                  </div>
                  {error ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</div>
                      <button
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                        onClick={() => setCreateAttempt((value) => value + 1)}
                        type="button"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {t('admin.commerce.payments.methods.testPayment.retry', 'Create again')}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isExpired ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="text-sm text-red-600 dark:text-red-400">
                    {t('admin.commerce.payments.methods.testPayment.expired', 'QR code expired')}
                    {' · '}
                    {t('admin.commerce.payments.methods.testPayment.expiredDesc', 'The test payment has expired. Create a new one to continue.')}
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                    onClick={() => setCreateAttempt((value) => value + 1)}
                    type="button"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('admin.commerce.payments.methods.testPayment.retry', 'Create again')}
                  </button>
                </div>
              ) : null}

              {simulateNotice ? (
                <div className="text-sm text-emerald-600 dark:text-emerald-400" role="status">{simulateNotice}</div>
              ) : null}

              {error && (hasQrSurface || hasJumpSurface || hasCardSurface || isSandbox) ? (
                <div className="flex w-full flex-col items-center gap-3">
                  <div className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</div>
                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                    onClick={() => setCreateAttempt((value) => value + 1)}
                    type="button"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('admin.commerce.payments.methods.testPayment.retry', 'Create again')}
                  </button>
                </div>
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
          {phase === 'ready' && testPayment && !isExpired && !isSandbox ? (
            <button
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              disabled={checking}
              onClick={() => void checkProviderStatus()}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              {checking ? t('admin.commerce.payments.dialog.saving', 'Saving...') : t('admin.commerce.payments.methods.testPayment.checkStatus', 'Check payment channel status')}
            </button>
          ) : null}
          {phase === 'ready' && testPayment && !isExpired && isSandbox ? (
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

/**
 * Mounts the Stripe.js card element into the dialog. Uses the raw Stripe
 * Elements API (no react-stripe-js dependency needed).
 */
function StripeCardElementWrapper({
  stripe,
  onReady,
}: {
  stripe: Stripe;
  onReady: (element: StripeCardElement) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }
    const elements = stripe.elements();
    const card = elements.create('card', {
      style: {
        base: {
          fontSize: '14px',
          color: '#0f172a',
          '::placeholder': { color: '#94a3b8' },
        },
      },
    });
    card.mount(host);
    onReady(card);
    return () => {
      card.unmount();
    };
  }, [onReady, stripe]);
  return <div ref={hostRef} />;
}
