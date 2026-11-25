import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageLayout } from '@sdkwork/ui-mobile-react';
import { CircleAlert, Loader2, Sparkles } from 'lucide-react';

import { PaymentMethodPicker, RedeemForm } from '../components/CommerceSheets.js';
import type { MembershipTranslate } from '../catalog/membershipDefinition.js';
import { formatMembershipCurrencyCny, formatMembershipPointsValue } from '../format.js';
import {
  getCloudRouterH5MembershipRuntime,
  type MembershipPaymentMethod,
  type MembershipRechargePackage,
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
    return t('redeem.successSubscription', '会员订阅已激活');
  }
  if (outcome.benefitKind === 'token_bank_credit') {
    return t('redeem.successTokenBank', '算力积分已到账');
  }
  if (outcome.benefitKind === 'points_credit') {
    return t('redeem.successPoints', '会员积分已发放');
  }
  return t('redeem.successCash', '账户余额已到账');
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
      const [nextBalance, nextPackages] = await Promise.all([
        runtime.loadTokenBankBalance().catch(() => null),
        runtime.loadRechargePackages(),
      ]);
      setBalance(nextBalance);
      setPackages(nextPackages);
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

  const handleRecharge = useCallback(async () => {
    if (!runtime) {
      return;
    }
    if (!runtime.signedIn) {
      onSignIn();
      return;
    }
    if (!selectedPackage) {
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const outcome = await runtime.createRechargeOrder({
        packageId: selectedPackage.id,
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
  }, [load, method, onSignIn, runtime, selectedPackage, t]);

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
    try {
      const outcome = await runtime.redeemCode(code);
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
                        {formatMembershipCurrencyCny(item.priceAmount)}
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

            {packages.length > 0 ? (
              <div className="rounded-xl border border-line bg-surface px-3 py-3">
                <PaymentMethodPicker onChange={setMethod} t={t} value={method} />
              </div>
            ) : null}

            {actionError ? (
              <p className="flex items-start gap-1.5 text-[12px] text-danger" role="alert">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {actionError}
              </p>
            ) : null}

            <button
              className="min-h-12 w-full rounded-full bg-brand-fill text-[15px] font-semibold text-on-brand active:bg-brand-fill-strong disabled:opacity-60"
              disabled={submitting || !selectedPackage}
              onClick={() => void handleRecharge()}
              type="button"
            >
              {submitting
                ? t('recharge.submitting', '正在创建订单…')
                : selectedPackage
                  ? t('rechargePage.payWithAmount', '立即支付 {amount}').replace(
                    '{amount}',
                    formatMembershipCurrencyCny(selectedPackage.priceAmount),
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
