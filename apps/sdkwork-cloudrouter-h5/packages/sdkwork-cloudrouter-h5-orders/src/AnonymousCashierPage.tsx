import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  detectPaymentEnvironment,
  invokeWechatJsapiPayment,
  isWechatJsapiResultCancelled,
  isWechatJsapiResultOk,
  type PaymentEnvironment,
} from '@sdkwork/order-mobile-react-orders';

import {
  createAnonymousCashierPayment,
  isCashierClosedStatus,
  isCashierPaidStatus,
  loadAnonymousCashier,
  loadAnonymousCashierStatus,
  resolveAnonymousMethodOptions,
  resolveCashierLaunch,
  type AnonymousWireMethod,
} from './anonymousCashier.js';

/** Backend cashier TTL used when the order carries no explicit expiry. */
const CASHIER_TTL_SECONDS = 15 * 60;
/** Payment status poll cadence while the payer is on a provider page. */
const POLL_INTERVAL_MS = 2000;

type CashierPhase =
  | 'loading'
  | 'ready'
  | 'creating'
  | 'pending'
  | 'paid'
  | 'expired'
  | 'cancelled'
  | 'not_payable'
  | 'failed';

export interface AnonymousCashierPageProps {
  /** Capability token from the scanned deep link. */
  readonly token: string;
  /** Where "my orders" lives once the payer signs in. */
  readonly orderCenterPath?: string;
  /** Sign-in route the anonymous page offers after payment. */
  readonly signInPath?: string;
  /**
   * IAM anonymous payment OAuth entry used inside WeChat.
   *
   * Built by the host because only the host knows the API origin; the page never
   * constructs transport URLs itself.
   */
  readonly wechatAuthorizeUrl?: string;
}

/**
 * No-login mobile cashier.
 *
 * The scanned link carries a capability token, not a session: this page renders
 * the payable order, launches the provider trade, and polls the anonymous status
 * endpoint. It never calls an authenticated order endpoint, and it never shows
 * order details beyond the cashier whitelist (subject/amount/status).
 */
export function AnonymousCashierPage({
  token,
  orderCenterPath = '/me/orders',
  signInPath = '/sign-in',
  wechatAuthorizeUrl,
}: AnonymousCashierPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const environment = useMemo<PaymentEnvironment>(() => detectPaymentEnvironment(), []);
  /** Payer openid returned by the anonymous payment OAuth, bound to this token. */
  const openid = searchParams.get('openid');
  const openidBinding = searchParams.get('openidBinding');

  const [phase, setPhase] = useState<CashierPhase>('loading');
  const [subject, setSubject] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyCode, setCurrencyCode] = useState('CNY');
  const [allowedMethods, setAllowedMethods] = useState<readonly string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<AnonymousWireMethod | null>(null);

  const phaseRef = useRef<CashierPhase>('loading');
  phaseRef.current = phase;
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const createInFlightRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const stopAt = useCallback((next: CashierPhase) => {
    clearTimers();
    setPhase(next);
  }, [clearTimers]);

  const pollStatus = useCallback(async () => {
    try {
      const status = await loadAnonymousCashierStatus(token);
      if (status.paid || isCashierPaidStatus(status.status)) {
        stopAt('paid');
        return;
      }
      if (isCashierClosedStatus(status.status)) {
        stopAt('cancelled');
      }
    } catch {
      // Transient failures keep the payer pending; the countdown owns expiry.
    }
  }, [stopAt, token]);

  const startPolling = useCallback(() => {
    clearTimers();
    const schedule = () => {
      pollTimerRef.current = setTimeout(() => {
        void pollStatus().finally(() => {
          if (phaseRef.current === 'pending') schedule();
        });
      }, POLL_INTERVAL_MS);
    };
    schedule();
    countdownTimerRef.current = setInterval(() => {
      setRemainingSeconds((previous) => {
        const next = Math.max(previous - 1, 0);
        if (next === 0 && previous > 0 && phaseRef.current === 'pending') {
          stopAt('expired');
        }
        return next;
      });
    }, 1000);
  }, [clearTimers, pollStatus, stopAt]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const view = await loadAnonymousCashier(token);
        if (cancelled) return;
        setSubject(view.subject ?? '');
        setAmount(view.amount ?? '');
        setCurrencyCode(view.currencyCode ?? 'CNY');
        setAllowedMethods(view.allowedMethods ?? []);
        const expiry = view.expireTime ? Date.parse(view.expireTime) : Number.NaN;
        const deadline = Number.isFinite(expiry)
          ? expiry
          : Date.now() + CASHIER_TTL_SECONDS * 1000;
        setRemainingSeconds(Math.max(Math.floor((deadline - Date.now()) / 1000), 0));
        if (!view.payable) {
          setPhase(isCashierClosedStatus(view.status) ? 'cancelled' : 'not_payable');
          return;
        }
        setPhase('ready');
      } catch (error) {
        if (cancelled) return;
        setErrorText(errorMessage(error));
        setPhase('failed');
      }
    })();
    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [clearTimers, token]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const options = useMemo(
    () => resolveAnonymousMethodOptions(environment, allowedMethods),
    [allowedMethods, environment],
  );

  const launch = useCallback(async (method: AnonymousWireMethod) => {
    if (createInFlightRef.current) return;
    // Inside WeChat the JSAPI trade needs the payer openid. Without it, hand the
    // payer to the anonymous payment OAuth first; the callback returns to this
    // exact cashier URL with the openid and its token binding.
    if (method === 'wechat_jsapi' && !openid) {
      if (wechatAuthorizeUrl) {
        window.location.assign(wechatAuthorizeUrl);
        return;
      }
      setNotice(t('orders.cashier_wechat_authorize_unavailable', '微信支付授权暂不可用，请稍后重试'));
      return;
    }
    createInFlightRef.current = true;
    setSelectedMethod(method);
    setPhase('creating');
    setNotice(null);
    setErrorText(null);
    try {
      const authorization =
        method === 'wechat_jsapi' && openid && openidBinding
          ? { openid, openidBinding }
          : undefined;
      const payment = await createAnonymousCashierPayment(token, method, authorization);
      const target = resolveCashierLaunch(payment);
      setPhase('pending');
      startPolling();
      if (target.kind === 'jsapi') {
        const result = await invokeWechatJsapiPayment(target.payload);
        if (isWechatJsapiResultCancelled(result)) {
          setNotice(t('orders.cashier_jsapi_cancelled', '已取消支付，可重新唤起'));
        } else if (!isWechatJsapiResultOk(result)) {
          setNotice(t('orders.cashier_jsapi_failed', '唤起微信支付失败，请重试'));
        }
        return;
      }
      if (target.kind === 'redirect') {
        window.location.assign(target.url);
        return;
      }
      setNotice(t('orders.cashier_pay_ready_tip', '支付尚未完成，请选择支付方式后重试'));
    } catch (error) {
      setErrorText(errorMessage(error));
      setPhase('ready');
    } finally {
      createInFlightRef.current = false;
    }
  }, [openid, openidBinding, startPolling, t, token, wechatAuthorizeUrl]);

  const formatCountdown = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatAmount = (minor: string, currency: string) => {
    const numeric = Number(minor);
    if (!Number.isFinite(numeric)) return `${minor} ${currency}`;
    const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : '';
    return `${symbol}${(numeric / 100).toFixed(2)}`;
  };

  const goSignIn = () => navigate(signInPath, { state: { from: orderCenterPath } });

  if (phase === 'loading') {
    return <Layout title={t('orders.cashier_title', '收银台')}>
      <p className="text-text-sub text-sm">{t('orders.cashier_creating', '正在创建支付...')}</p>
    </Layout>;
  }

  if (phase === 'paid') {
    return <Layout title={t('orders.cashier_paid_title', '支付成功')}>
      <p className="text-text-sub text-sm">{t('orders.cashier_paid_desc', '支付已完成，订单将尽快为您处理。')}</p>
      <button onClick={goSignIn} className="mt-6 w-full bg-primary-blue text-white font-medium text-[15px] py-3 rounded-xl">
        {t('orders.cashier_anonymous_login', '登录后查看订单')}
      </button>
    </Layout>;
  }

  if (phase === 'expired' || phase === 'cancelled' || phase === 'not_payable' || phase === 'failed') {
    const title = phase === 'expired'
      ? t('orders.cashier_expired_title', '支付超时')
      : phase === 'cancelled'
        ? t('orders.cashier_cancelled_title', '订单已取消')
        : phase === 'not_payable'
          ? t('orders.cashier_not_payable_title', '订单不可支付')
          : t('orders.cashier_failed_title', '支付创建失败');
    const description = errorText
      ?? (phase === 'expired'
        ? t('orders.cashier_expired_desc', '支付已超时，订单已自动关闭。')
        : phase === 'cancelled'
          ? t('orders.cashier_cancelled_desc', '订单已取消，如有疑问请联系商家。')
          : phase === 'not_payable'
            ? t('orders.cashier_not_payable_desc', '该订单当前状态不支持支付。')
            : t('orders.cashier_failed_desc', '请重试或稍后再试。'));
    return <Layout title={title}>
      <p className="text-text-sub text-sm">{description}</p>
      <button onClick={goSignIn} className="mt-6 w-full border border-border-color text-text-main font-medium text-[15px] py-3 rounded-xl">
        {t('orders.cashier_anonymous_login', '登录后查看订单')}
      </button>
    </Layout>;
  }

  return (
    <Layout title={t('orders.cashier_title', '收银台')}>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs text-text-sub">{t('orders.cashier_amount_label', '支付金额')}</p>
        <p className="mt-1 text-3xl font-bold text-text-main">{formatAmount(amount, currencyCode)}</p>
        {subject ? <p className="mt-2 text-sm text-text-sub">{subject}</p> : null}
        {remainingSeconds > 0 ? (
          <p className="mt-3 text-xs text-text-sub">
            {t('orders.cashier_auto_close', '剩余 {{countdown}} 自动关闭', {
              countdown: formatCountdown(remainingSeconds),
            })}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {options.length === 0 ? (
          <p className="text-sm text-text-sub">
            {t('orders.cashier_mobile_open_app', '请在微信或支付宝中打开本页面完成支付')}
          </p>
        ) : (
          options.map((option) => (
            <button
              key={option.method}
              disabled={phase === 'creating'}
              onClick={() => void launch(option.method)}
              className="flex w-full items-center gap-3 rounded-xl border border-border-color bg-white px-4 py-4 text-left disabled:opacity-60"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-sm ${option.badgeClass}`}>
                {option.badge}
              </span>
              <span className="text-[15px] font-medium text-text-main">
                {t(option.labelKey, option.labelDefault)}
              </span>
              {phase === 'creating' && selectedMethod === option.method ? (
                <span className="ml-auto text-xs text-text-sub">
                  {t('orders.cashier_creating', '正在创建支付...')}
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>

      {phase === 'pending' ? (
        <p className="mt-4 text-xs text-text-sub">
          {t('orders.cashier_pay_ready_tip', '支付尚未完成，请选择支付方式后重试')}
        </p>
      ) : null}
      {notice ? <p className="mt-3 text-xs text-text-sub">{notice}</p> : null}
      {errorText ? <p className="mt-3 text-xs text-[var(--cr-danger,#d92d20)]">{errorText}</p> : null}
    </Layout>
  );
}

function Layout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas px-5 py-6">
      <h1 className="mb-4 text-center text-[17px] font-semibold text-text-main">{title}</h1>
      {children}
    </div>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return '支付请求失败，请稍后重试。';
}
