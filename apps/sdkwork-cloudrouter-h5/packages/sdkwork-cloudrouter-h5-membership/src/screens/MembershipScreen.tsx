import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageLayout } from '@sdkwork/ui-mobile-react';
import { CircleAlert, Loader2 } from 'lucide-react';

import {
  buildComparisonCategories,
  mapPackageGroupsToBillingCycles,
  mapPackagesToPlanCards,
  mapPackagesToTierColumns,
  resolveMemberLevelNameFromPlanRank,
  resolveMemberSummaryFromPlanRank,
  sortMembershipPackageGroups,
  type MembershipTranslate,
} from '../catalog/membershipDefinition.js';
import { BillingCycleTabs, PlanCardList } from '../components/MembershipPlans.js';
import { MembershipHero } from '../components/MembershipHero.js';
import { useMembershipToast } from '../components/MembershipToast.js';
import {
  CheckoutSheet,
  RedeemSheet,
  TokenBankDetailsSheet,
  TokenBankRechargeSheet,
  type CheckoutPlanSummary,
  type RechargeSelection,
} from '../components/CommerceSheets.js';
import { TierCompareTable } from '../components/TierCompareTable.js';
import { TeamMembershipSurface } from '../components/TeamMembershipSurface.js';
import { formatMembershipCurrency } from '../format.js';
import { createMembershipOperationKey } from '../operationKey.js';
import {
  getCloudRouterH5MembershipRuntime,
  type MembershipCatalogSnapshot,
  type MembershipMemberProfile,
  type MembershipOrderOutcome,
  type MembershipPaymentMethod,
  type MembershipRechargePackage,
  type MembershipRechargeSettings,
  type MembershipRedeemOutcome,
} from '../runtime.js';

export interface MembershipScreenProps {
  /** Host navigation: sends the buyer to the console sign-in screen. */
  readonly onSignIn: () => void;
  readonly t: MembershipTranslate;
}

type MembershipAudience = 'personal' | 'team';

function formatRedeemDate(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function describeRedeemOutcome(outcome: MembershipRedeemOutcome, t: MembershipTranslate): string {
  if (outcome.benefitKind === 'subscription') {
    const expires = formatRedeemDate(outcome.expiresAt);
    return t('redeem.successSubscription', '会员订阅已激活')
      + (typeof outcome.totalQuota === 'number'
        ? ` · ${t('redeem.totalQuota', '总额度 {{quota}}').replace('{{quota}}', String(outcome.totalQuota))}`
        : '')
      + (expires
        ? ` · ${t('redeem.expiresAt', '有效期至 {{date}}').replace('{{date}}', expires)}`
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
  // Cash grants are carried in the currency minor unit (1250 = 12.50).
  const cashAmount = typeof outcome.grantAmount === 'number'
    ? outcome.grantAmount / 100
    : null;
  return t('redeem.successCash', '账户余额已到账')
    + (cashAmount !== null
      ? ` · ${formatMembershipCurrency(cashAmount, outcome.currencyCode ?? 'CNY')}`
      : '');
}

/**
 * Cloud Router mobile membership center (`/membership`).
 *
 * The definition — billing-cycle package groups, plan tiers, membership points
 * allowance, and the benefit comparison matrix — is the Cloud Router token-plan
 * definition the PC `/token-plan` page renders. The mobile treatment differs by
 * design: a status hero with the Token Bank balance, a chip rail for billing
 * cycles, stacked plan cards, a sticky-column comparison for narrow screens, and
 * bottom sheets for checkout, Token Bank recharge, and redemption hand-off to
 * the H5 cashier.
 */
export function MembershipScreen({ onSignIn, t }: MembershipScreenProps) {
  const runtime = useMemo(() => getCloudRouterH5MembershipRuntime(), []);
  const { pushToast, ToastOutlet } = useMembershipToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<MembershipCatalogSnapshot | null>(null);
  const [profile, setProfile] = useState<MembershipMemberProfile | null>(null);
  const [tokenBankBalance, setTokenBankBalance] = useState<number | null>(null);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [audience, setAudience] = useState<MembershipAudience>('personal');
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlanSummary | null>(null);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const redeemKeys = useRef(new Map<string, string>());
  const [rechargePackages, setRechargePackages] = useState<readonly MembershipRechargePackage[]>([]);
  const [rechargePackagesLoading, setRechargePackagesLoading] = useState(false);
  const [rechargeSettings, setRechargeSettings] = useState<MembershipRechargeSettings | null>(null);
  const [rechargeError, setRechargeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [redeemResult, setRedeemResult] = useState<string | null>(null);

  const signedIn = runtime?.signedIn ?? false;
  // The PC token-plan page defaults to the single-month cycle; initialize the
  // mobile cycle rail once, then let the buyer's own selection win.
  const cycleInitialized = useRef(false);

  const load = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!runtime) {
      setLoading(false);
      setError(t('unavailable', '会员能力尚未接入'));
      return;
    }
    if (!options.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [nextCatalog, nextProfile, nextBalance] = await Promise.all([
        runtime.loadCatalog(),
        runtime.loadMemberProfile().catch(() => null),
        runtime.loadTokenBankBalance().catch(() => null),
      ]);
      setCatalog(nextCatalog);
      setProfile(nextProfile);
      setTokenBankBalance(nextBalance);
      setCycleIndex((current) => {
        const sorted = sortMembershipPackageGroups(nextCatalog.groups);
        const maxIndex = Math.max(sorted.length - 1, 0);
        if (!cycleInitialized.current && sorted.length > 0) {
          cycleInitialized.current = true;
          const singleMonth = sorted.findIndex(
            (group) => (group.billingCycle ?? '').trim().toLowerCase() === 'once',
          );
          return singleMonth >= 0 ? singleMonth : 0;
        }
        return Math.min(current, maxIndex);
      });
    } catch (cause: unknown) {
      setError(cause instanceof Error && cause.message
        ? cause.message
        : t('loadFailed', '会员信息加载失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  }, [runtime, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(
    () => sortMembershipPackageGroups(catalog?.groups ?? []),
    [catalog],
  );
  const billingCycles = useMemo(() => mapPackageGroupsToBillingCycles(groups), [groups]);
  const activeGroup = groups[cycleIndex];
  const memberSummary = useMemo(
    () => resolveMemberSummaryFromPlanRank(profile?.planRank ?? null),
    [profile],
  );
  const planCards = useMemo(
    () => mapPackagesToPlanCards(
      activeGroup?.packages ?? [],
      catalog?.plans ?? [],
      memberSummary,
      t,
    ),
    [activeGroup, catalog, memberSummary, t],
  );
  const tierColumns = useMemo(
    () => mapPackagesToTierColumns(
      activeGroup?.packages ?? [],
      catalog?.plans ?? [],
      memberSummary,
      t,
    ),
    [activeGroup, catalog, memberSummary, t],
  );
  const comparisonCategories = useMemo(
    () => buildComparisonCategories(catalog?.benefitsByRank ?? {}, t),
    [catalog, t],
  );
  const levelName = signedIn
    ? profile?.levelName ?? resolveMemberLevelNameFromPlanRank(profile?.planRank ?? null, t)
    : t('level.guest', '登录查看会员权益');

  const openCheckout = useCallback((packageId: number) => {
    if (!runtime) {
      return;
    }
    if (!runtime.signedIn) {
      onSignIn();
      return;
    }
    const card = planCards.find((plan) => plan.packageId === packageId);
    if (!card) {
      return;
    }
    setSheetError(null);
    setCheckoutPlan({
      name: card.name,
      originalPriceLabel: card.originalPriceLabel,
      packageId: card.packageId,
      periodLabel: card.periodLabel,
      planRank: card.planRank,
      priceLabel: card.priceLabel,
    });
  }, [onSignIn, planCards, runtime]);

  const loadRechargeData = useCallback(async () => {
    if (!runtime) {
      return;
    }
    setRechargePackagesLoading(true);
    setRechargeError(null);
    try {
      const [packages, settings] = await Promise.all([
        runtime.loadRechargePackages(),
        runtime.loadRechargeSettings().catch(() => null),
      ]);
      setRechargePackages(packages);
      setRechargeSettings(settings);
    } catch (cause) {
      setRechargePackages([]);
      setRechargeError(cause instanceof Error && cause.message
        ? cause.message
        : t('recharge.loadFailed', '充值套餐加载失败，请重试。'));
    } finally {
      setRechargePackagesLoading(false);
    }
  }, [runtime, t]);

  const openTokenBankRecharge = useCallback(async () => {
    if (!runtime) {
      return;
    }
    if (!runtime.signedIn) {
      onSignIn();
      return;
    }
    setSheetError(null);
    setRechargeError(null);
    setRechargeOpen(true);
    await loadRechargeData();
  }, [loadRechargeData, onSignIn, runtime]);

  const openRedeem = useCallback(() => {
    if (!runtime) {
      return;
    }
    if (!runtime.signedIn) {
      onSignIn();
      return;
    }
    setSheetError(null);
    setRedeemResult(null);
    setRedeemOpen(true);
  }, [onSignIn, runtime]);

  /**
   * Hands the buyer to the H5 cashier. The order backend mints the cashier URL
   * for `mobile_cashier_h5`; navigating there keeps the payment protocol in the
   * order/payment owner instead of reimplementing QR polling on the membership
   * page.
   */
  const handOffToCashier = useCallback((outcome: {
    readonly cashierUrl?: string;
    readonly status: MembershipOrderOutcome['status'];
  }): boolean => {
    if (outcome.cashierUrl) {
      window.location.assign(outcome.cashierUrl);
      return true;
    }
    return false;
  }, []);

  const handleConfirmPurchase = useCallback(async (method: MembershipPaymentMethod) => {
    if (!runtime || !checkoutPlan) {
      return;
    }
    if (!runtime.signedIn) {
      setCheckoutPlan(null);
      onSignIn();
      return;
    }
    setSubmitting(true);
    setSheetError(null);
    try {
      const outcome = await runtime.createMembershipOrder({
        packageId: checkoutPlan.packageId,
        paymentMethod: method,
        targetPlanRank: checkoutPlan.planRank,
      });
      if (handOffToCashier(outcome)) {
        return;
      }
      if (outcome.status === 'completed') {
        setCheckoutPlan(null);
        pushToast(t('toast.subscribed', '会员开通成功'));
        await load({ silent: true });
        return;
      }
      if (outcome.status === 'pending') {
        setCheckoutPlan(null);
        pushToast(t('toast.pending', '支付处理中，请稍后在订单中心查看'));
        return;
      }
      setSheetError(t('error.orderFailed', '订单创建失败，请稍后重试'));
    } catch (cause: unknown) {
      setSheetError(cause instanceof Error && cause.message
        ? cause.message
        : t('error.orderFailed', '订单创建失败，请稍后重试'));
    } finally {
      setSubmitting(false);
    }
  }, [checkoutPlan, handOffToCashier, load, onSignIn, pushToast, runtime, t]);

  const handleConfirmRecharge = useCallback(async (
    selection: RechargeSelection,
    method: MembershipPaymentMethod,
  ) => {
    if (!runtime) {
      return;
    }
    if (!runtime.signedIn) {
      setRechargeOpen(false);
      onSignIn();
      return;
    }
    setSubmitting(true);
    setSheetError(null);
    try {
      const outcome = await runtime.createRechargeOrder({
        ...(selection.packageId ? { packageId: selection.packageId } : {}),
        ...(selection.amount ? { amount: selection.amount } : {}),
        paymentMethod: method,
      });
      if (handOffToCashier(outcome)) {
        return;
      }
      if (outcome.status === 'completed') {
        setRechargeOpen(false);
        pushToast(t('toast.recharged', '算力积分已到账'));
        await load({ silent: true });
        return;
      }
      if (outcome.status === 'pending') {
        setRechargeOpen(false);
        pushToast(t('toast.pending', '支付处理中，请稍后在订单中心查看'));
        return;
      }
      setSheetError(t('error.orderFailed', '订单创建失败，请稍后重试'));
    } catch (cause: unknown) {
      setSheetError(cause instanceof Error && cause.message
        ? cause.message
        : t('error.orderFailed', '订单创建失败，请稍后重试'));
    } finally {
      setSubmitting(false);
    }
  }, [handOffToCashier, load, onSignIn, pushToast, runtime, t]);

  const handleRedeem = useCallback(async (code: string) => {
    if (!runtime) {
      return;
    }
    if (!runtime.signedIn) {
      setRedeemOpen(false);
      onSignIn();
      return;
    }
    setSubmitting(true);
    setSheetError(null);
    // One idempotency key per code, reused across retries until the redemption
    // succeeds, so a retry after a partial failure never consumes the code twice.
    const redeemKey = redeemKeys.current.get(code)
      ?? createMembershipOperationKey('membership-redeem');
    redeemKeys.current.set(code, redeemKey);
    try {
      const outcome = await runtime.redeemCode(code, redeemKey);
      redeemKeys.current.delete(code);
      setRedeemResult(describeRedeemOutcome(outcome, t));
      await load({ silent: true });
    } catch (cause: unknown) {
      setSheetError(cause instanceof Error && cause.message
        ? cause.message
        : t('error.redeemFailed', '兑换失败，请检查兑换码后重试'));
    } finally {
      setSubmitting(false);
    }
  }, [load, onSignIn, runtime, t]);

  return (
    <PageLayout bgClass="bg-canvas" title={t('title', '会员中心')}>
      <div className="flex flex-col pb-8" data-membership-screen>
        <div className="px-3 pt-3">
          <div
            aria-label={t('audience.title', '会员类型')}
            className="grid grid-cols-2 gap-1 rounded-full bg-surface-elevated p-1"
            role="tablist"
          >
            {([
              { key: 'personal', label: t('audience.personal', '个人会员') },
              { key: 'team', label: t('audience.team', '团队会员') },
            ] as const).map((option) => {
              const selected = audience === option.key;
              return (
                <button
                  aria-selected={selected}
                  className={`min-h-9 rounded-full text-[13px] font-semibold transition-colors ${
                    selected
                      ? 'bg-surface text-ink shadow-sm'
                      : 'text-ink-muted'
                  }`}
                  key={option.key}
                  onClick={() => setAudience(option.key)}
                  role="tab"
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {audience === 'team' ? (
          <TeamMembershipSurface onNotify={pushToast} onSignIn={onSignIn} t={t} />
        ) : (
          <>
            <MembershipHero
              levelName={levelName}
              onOpenRedeem={openRedeem}
              onOpenTokenBankDetails={() => {
                if (!runtime?.signedIn) {
                  onSignIn();
                  return;
                }
                setDetailsOpen(true);
              }}
              onOpenTokenBankRecharge={() => void openTokenBankRecharge()}
              onSignIn={onSignIn}
              profile={profile}
              signedIn={signedIn}
              t={t}
              tokenBankBalance={signedIn ? tokenBankBalance : null}
            />

            {loading && !catalog ? (
              <div className="mx-3 mt-6 flex flex-col items-center gap-2 rounded-xl bg-surface px-4 py-10">
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-brand" />
                <p className="text-[12px] text-ink-subtle">{t('loading', '正在加载会员套餐…')}</p>
              </div>
            ) : null}

            {!loading && error ? (
              <div className="mx-3 mt-4 rounded-xl bg-surface px-4 py-6 text-center">
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

            {catalog ? (
              <>
                <BillingCycleTabs
                  cycles={billingCycles}
                  onSelect={setCycleIndex}
                  selectedIndex={cycleIndex}
                  t={t}
                />

                <PlanCardList onSelect={openCheckout} plans={planCards} t={t} />

                <TierCompareTable
                  categories={comparisonCategories}
                  onSelect={openCheckout}
                  t={t}
                  tierColumns={tierColumns}
                />

                <p className="mt-6 px-4 text-center text-[11px] leading-snug text-ink-subtle">
                  {t('footer.note', '会员套餐、算力积分与权益以服务端配置为准，开通后立即生效。')}
                </p>
              </>
            ) : null}
          </>
        )}
      </div>

      <CheckoutSheet
        error={sheetError}
        onClose={() => {
          if (submitting) return;
          setCheckoutPlan(null);
        }}
        onConfirm={(method) => void handleConfirmPurchase(method)}
        open={checkoutPlan !== null}
        plan={checkoutPlan}
        submitting={submitting}
        t={t}
      />

      <TokenBankRechargeSheet
        balance={signedIn ? tokenBankBalance : null}
        error={sheetError ?? rechargeError}
        loading={rechargePackagesLoading}
        onClose={() => {
          if (submitting) return;
          setRechargeOpen(false);
        }}
        onConfirm={(selection, method) => void handleConfirmRecharge(selection, method)}
        onRetry={() => void loadRechargeData()}
        open={rechargeOpen}
        packages={rechargePackages}
        settings={rechargeSettings}
        submitting={submitting}
        t={t}
      />

      <TokenBankDetailsSheet
        balance={tokenBankBalance}
        onClose={() => setDetailsOpen(false)}
        onOpenRecharge={() => {
          setDetailsOpen(false);
          void openTokenBankRecharge();
        }}
        onOpenRedeem={() => {
          setDetailsOpen(false);
          openRedeem();
        }}
        open={detailsOpen}
        t={t}
      />

      <RedeemSheet
        error={sheetError}
        onClose={() => {
          if (submitting) return;
          setRedeemOpen(false);
        }}
        onSubmit={(code) => void handleRedeem(code)}
        open={redeemOpen}
        resultMessage={redeemResult}
        submitting={submitting}
        t={t}
      />

      <ToastOutlet />
    </PageLayout>
  );
}
