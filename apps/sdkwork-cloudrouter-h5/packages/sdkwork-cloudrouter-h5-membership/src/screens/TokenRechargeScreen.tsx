import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageLayout } from '@sdkwork/ui-mobile-react';
import { CircleAlert, Loader2, Sparkles } from 'lucide-react';

import { PaymentMethodPicker, RedeemForm, parseCustomRechargeAmount } from '../components/CommerceSheets.js';
import type { MembershipTranslate } from '../catalog/membershipDefinition.js';
import { formatMembershipCurrency, formatMembershipPointsValue } from '../format.js';
import { createMembershipOperationKey } from '../operationKey.js';
import {
  getCloudRouterH5MembershipRuntime,
  type MembershipPaymentMethod,
  type MembershipRechargePackage,
  type MembershipRechargeSettings,
  type MembershipRedeemOutcome,
} from '../runtime.js';

export type TokenRechargeTab = 'coupon' | 'recharge';

export interface TokenRechargeScreenProps {
  readonly initialTab?: TokenRechargeTab;
  readonly onSignIn: () => void;
  readonly t: MembershipTranslate;
}

function describeRedeemResult(outcome: MembershipRedeemOutcome, t: MembershipTranslate): string {
  if (outcome.benefitKind === 'subscription') {
    const expires = outcome.expiresAt ? new Date(outcome.expiresAt) : null;
    const label = expires && !Number.isNaN(expires.getTime())
      ? expires.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : '';
    return t('redeem.successSubscription', '会员订阅已激活')
      + (label
        ? ` · ${t('redeem.expiresAt', '有效期至 {{date}}').replace('{{date}}', label)}`
        : '');
  }
  if (outcome.benefitKind === 'token_bank_credit') {
    return t('redeem.successTokenBank', '算力积分已到账')
      + (typeof outcome.grantAmount === 'number'
        ? ` · ${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 6 }).format(outcome.grantAmount)}`
        : '');
  }
  if (outcome.benefitKind === 'points_credit') {
    return t('redeem.successPoints', '会员积分已发放')
      + (typeof outcome.grantPoints === 'number'
        ? ` · ${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 6 }).format(outcome.grantPoints)}`
        : '');
  }
  const cashAmount = typeof outcome.grantAmount === 'number' ? outcome.grantAmount / 100 : null;
  return t('redeem.successCash', '账户余额已到账')
    + (cashAmount !== null
      ? ` · ${formatMembershipCurrency(cashAmount, outcome.currencyCode ?? 'CNY')}`
      : '');
}

/**
 * Token Bank recharge + membership redemption (`/recharge`).
 *
 * The PC token-plan surface exposes these two actions from the catalog hero; on
 * a phone they get their own stacked page so the buyer can top up compute
 * credits or redeem a code without scrolling a long plan catalog first. Package
 * prices and credits come from the order-owned recharge catalog — the demo SKUs
 * the previous prototype rendered are gone.
 */
export function TokenRechargeScreen({ initialTab = 'recharge', onSignIn, t }: TokenRechargeScreenProps) {
  const runtime = useMemo(() => getCloudRouterH5MembershipRuntime(), []);
  const [tab, setTab] = useState<TokenRechargeTab>(initialTab);
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<readonly MembershipRechargePackage[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [method, setMethod] = useState<MembershipPaymentMethod>('wechat_pay');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [redeemResult, setRedeemResult] = useState<string | null>(null);
  const redeemKeys = useRef(new Map<string, string>());
  const [settings, setSettings] = useState<MembershipRechargeSettings | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  const signedIn = runtime?.signedIn ?? false;

  const load = useCallback(async () => {
    if (!runtime) {
      setLoading(false);
      setError(t('unavailable', '会员能力尚未接入'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextBalance, nextPackages, nextSettings] = await Promise.all([
        runtime.loadTokenBankBalance().catch(() => null),
        runtime.loadRechargePackages(),
        runtime.loadRechargeSettings().catch(() => null),
      ]);
      setBalance(nextBalance);
      setPackages(nextPackages);
      setSettings(nextSettings);
      setSelectedId((current) => current || nextPackages[0]?.id || '');
    } catch (cause: unknown) {
      setError(cause instanceof Error && cause.message
        ? cause.message
        : t('loadFailed', '充值信息加载失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  }, [runtime, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPackage = packages.find((item) => item.id === selectedId) ?? null;
  const parsedCustomAmount = parseCustomRechargeAmount(customAmount);
  const customPreviewPoints = parsedCustomAmount !== null && settings
    ? parsedCustomAmount * settings.basePointsPerCny
    : null;
  const rechargeSelectionValid = customMode
    ? parsedCustomAmount !== null
    : selectedPackage !== null;
  const rechargeTotalLabel = customMode
    ? parsedCustomAmount !== null
      ? formatMembershipCurrency(parsedCustomAmount, 'CNY')
      : t('rechargePage.selectPackage', '请选择充值套餐')
    : selectedPackage
      ? formatMembershipCurrency(selectedPackage.priceAmount, selectedPackage.currencyCode)
      : t('rechargePage.selectPackage', '请选择充值套餐');

  const handleRecharge = useCallback(async () => {
    if (!runtime) {
      return;
    }
    if (!runtime.signedIn) {
      onSignIn();
      return;
    }
    const selection = customMode
      ? (parsedCustomAmount !== null ? { amount: customAmount.trim() } : null)
      : (selectedPackage ? { packageId: selectedPackage.id } : null);
    if (!selection) {
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const outcome = await runtime.createRechargeOrder({
        ...selection,
        paymentMethod: method,
      });
      if (outcome.cashierUrl) {
        window.location.assign(outcome.cashierUrl);
        return;
      }
      if (outcome.status === 'completed') {
        await load();
        setActionError(null);
        return;
      }
      if (outcome.status === 'pending') {
        setActionError(t('toast.pending', '支付处理中，请稍后在订单中心查看'));
        return;
      }
      setActionError(t('error.orderFailed', '订单创建失败，请稍后重试'));
    } catch (cause: unknown) {
      setActionError(cause instanceof Error && cause.message
        ? cause.message
        : t('error.orderFailed', '订单创建失败，请稍后重试'));
    } finally {
      setSubmitting(false);
    }
  }, [customAmount, customMode, load, method, onSignIn, parsedCustomAmount, runtime, selectedPackage, t]);

  const handleRedeem = useCallback(async (code: string) => {
    if (!runtime) {
      return;
    }
    if (!runtime.signedIn) {
      onSignIn();
      return;
    }
    setSubmitting(true);
    setActionError(null);
    const redeemKey = redeemKeys.current.get(code)
      ?? createMembershipOperationKey('membership-redeem');
    redeemKeys.current.set(code, redeemKey);
    try {
      const outcome = await runtime.redeemCode(code, redeemKey);
      redeemKeys.current.delete(code);
      setRedeemResult(describeRedeemResult(outcome, t));
      await load();
    } catch (cause: unknown) {
      setActionError(cause instanceof Error && cause.message
        ? cause.message
        : t('error.redeemFailed', '兑换失败，请检查兑换码后重试'));
    } finally {
      setSubmitting(false);
    }
  }, [load, onSignIn, runtime, t]);

  const tabs: ReadonlyArray<{ key: TokenRechargeTab; label: string }> = [
    { key: 'recharge', label: t('rechargePage.tabRecharge', '算力积分充值') },
    { key: 'coupon', label: t('rechargePage.tabRedeem', '会员兑换') },
  ];

  return (
    <PageLayout bgClass="bg-canvas" title={t('rechargePage.title', '充值中心')}>
      <div className="flex flex-col pb-8" data-token-recharge-screen>
        <div className="flex gap-2 px-3 pt-3" role="tablist">
          {tabs.map((item) => {
            const selected = item.key === tab;
            return (
              <button
                aria-selected={selected}
                className={`min-h-10 flex-1 rounded-full border text-[13px] font-medium ${
                  selected
                    ? 'border-brand bg-brand-fill text-on-brand'
                    : 'border-line bg-surface text-ink-muted'
                }`}
                key={item.key}
                onClick={() => {
                  setTab(item.key);
                  setActionError(null);
                }}
                role="tab"
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === 'recharge' ? (
          <div className="mt-3 flex flex-col gap-3 px-3" data-token-recharge-panel>
            <div className="rounded-2xl bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#3b82f6] px-4 py-4 text-white">
              <p className="flex items-center gap-1 text-[11px] text-white/75">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                {t('recharge.balance', '当前算力积分')}
              </p>
              <p className="mt-1 text-[26px] font-bold leading-none tabular-nums">
                {signedIn ? formatMembershipPointsValue(balance) : '--'}
              </p>
              {!signedIn ? (
                <button
                  className="mt-2 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#1d4ed8]"
                  onClick={onSignIn}
                  type="button"
                >
                  {t('hero.signIn', '去登录')}
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-2 rounded-xl bg-surface px-4 py-10">
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-brand" />
                <p className="text-[12px] text-ink-subtle">{t('loading', '正在加载会员套餐…')}</p>
              </div>
            ) : null}

            {!loading && error ? (
              <div className="rounded-xl bg-surface px-4 py-6 text-center">
                <CircleAlert aria-hidden="true" className="mx-auto h-5 w-5 text-danger" />
                <p className="mt-2 text-[13px] text-ink-muted">{error}</p>
                <button
                  className="mt-3 min-h-9 rounded-full border border-line px-4 text-[12px] font-medium text-ink"
                  onClick={() => void load()}
                  type="button"
                >
                  {t('retry', '重试')}
                </button>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-elevated p-1" role="tablist">
              {([
                { key: false, label: t('recharge.packageMode', '选择套餐') },
                { key: true, label: t('recharge.customMode', '自定义金额') },
              ] as const).map((option) => {
                const selected = customMode === option.key;
                return (
                  <button
                    aria-selected={selected}
                    className={`min-h-9 rounded-full text-[12px] font-semibold ${
                      selected ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted'
                    }`}
                    key={String(option.key)}
                    onClick={() => setCustomMode(option.key)}
                    role="tab"
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {!customMode ? (
              <>
                {!loading && !error && packages.length === 0 ? (
                  <p className="rounded-xl bg-surface px-4 py-8 text-center text-[13px] text-ink-subtle">
                    {t('recharge.empty', '暂无可购买的充值套餐')}
                  </p>
                ) : null}
                {packages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2" data-token-recharge-packages>
                    {packages.map((item) => {
                      const selected = item.id === selectedId;
                      return (
                        <button
                          aria-pressed={selected}
                          className={`min-h-[6rem] rounded-xl border px-3 py-3 text-left ${
                            selected ? 'border-brand bg-brand-soft' : 'border-line bg-surface'
                          }`}
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          type="button"
                        >
                          <span className="block text-[17px] font-bold tabular-nums text-ink">
                            {formatMembershipPointsValue(item.points)}
                          </span>
                          <span className="block text-[10px] text-ink-subtle">
                            {t('recharge.pointsUnit', '算力积分')}
                          </span>
                          <span className="mt-1 block text-[13px] font-semibold text-brand">
                            {formatMembershipCurrency(item.priceAmount, item.currencyCode)}
                          </span>
                          {item.bonusPoints > 0 ? (
                            <span className="mt-0.5 block text-[10px] text-emerald-600">
                              {t('recharge.bonus', '赠 {points} 算力积分').replace(
                                '{points}',
                                formatMembershipPointsValue(item.bonusPoints),
                              )}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl border border-line bg-surface px-3 py-3">
                <label className="block text-[12px] font-medium text-ink-subtle" htmlFor="token-recharge-custom-amount">
                  {t('recharge.customLabel', '自定义充值金额（元）')}
                </label>
                <input
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-line bg-canvas px-3 text-[15px] font-semibold tabular-nums text-ink outline-none focus:border-brand"
                  id="token-recharge-custom-amount"
                  inputMode="decimal"
                  onChange={(event) => setCustomAmount(event.target.value)}
                  placeholder={t('recharge.customPlaceholder', '1 – 10000')}
                  value={customAmount}
                />
                <p className="mt-1 text-[10px] text-ink-subtle">
                  {customPreviewPoints !== null
                    ? t('recharge.customPreview', '预计到账 {{points}} 算力积分').replace(
                      '{{points}}',
                      formatMembershipPointsValue(customPreviewPoints),
                    )
                    : t('recharge.customHint', '金额范围 1 – 10000 元，到账额度以服务端为准')}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-line bg-surface px-3 py-3">
              <PaymentMethodPicker onChange={setMethod} t={t} value={method} />
            </div>

            <button
              aria-pressed={agreementAccepted}
              className="flex w-full items-start gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left"
              onClick={() => setAgreementAccepted((current) => !current)}
              type="button"
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                  agreementAccepted
                    ? 'border-brand bg-brand-fill text-white'
                    : 'border-line-strong text-transparent'
                }`}
              >
                ✓
              </span>
              <span className="text-[11px] leading-snug text-ink-muted">
                {t('recharge.agreement', '我已阅读并同意《Token Bank 充值服务协议》')}
              </span>
            </button>

            {actionError ? (
              <p className="flex items-start gap-1.5 text-[12px] text-danger" role="alert">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {actionError}
              </p>
            ) : null}

            <button
              className="min-h-12 w-full rounded-full bg-brand-fill text-[15px] font-semibold text-on-brand active:bg-brand-fill-strong disabled:opacity-60"
              disabled={submitting || !rechargeSelectionValid || !agreementAccepted}
              onClick={() => void handleRecharge()}
              type="button"
            >
              {submitting
                ? t('recharge.submitting', '正在创建订单…')
                : rechargeSelectionValid
                  ? t('rechargePage.payWithAmount', '立即支付 {amount}').replace(
                    '{amount}',
                    rechargeTotalLabel,
                  )
                  : t('rechargePage.selectPackage', '请选择充值套餐')}
            </button>
          </div>
        ) : (
          <div className="mt-3 px-3" data-token-redeem-panel>
            <div className="rounded-xl border border-line bg-surface px-4 py-4">
              <RedeemForm
                error={actionError}
                onSubmit={(code) => void handleRedeem(code)}
                resultMessage={redeemResult}
                submitting={submitting}
                t={t}
              />
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
