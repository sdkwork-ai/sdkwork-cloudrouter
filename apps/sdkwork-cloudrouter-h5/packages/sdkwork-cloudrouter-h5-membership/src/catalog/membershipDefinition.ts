import { formatMoney } from '@sdkwork/utils/money';

import { formatSdkworkMembershipPoints, toNullableSdkworkMembershipNumber, toSdkworkMembershipNumber, toSdkworkMembershipOptionalString } from '@sdkwork/membership-service';

/**
 * Cloud Router membership (token-plan) definition — H5 owner.
 *
 * The PC portal renders the same definition from
 * `@sdkwork/membership-pc-subscription` (`subscription-catalog-mapper.ts`): four
 * plan ranks, the rank → membership-tier-key mapping, the billing-cycle groups,
 * the per-period membership points allowance, the plan-card feature templates,
 * and the benefit comparison matrix. This module is the H5-authored mirror of
 * that definition so the mobile renderer presents the same levels, prices,
 * points, and benefit rows; the layout and interaction are mobile-native, the
 * definition is shared.
 *
 * Keep this file free of React and of raw transport: it maps wire catalog data
 * (int64 serialized as strings) into view models only.
 */

/** Tier key used by the catalog when a plan cannot be purchased. */
export const CLOUDROUTER_MEMBERSHIP_UNAVAILABLE_TIER_KEY = 'none' as const;

/** Plan rank whose benefits are complete in the static comparison fallbacks. */
export const CLOUDROUTER_MEMBERSHIP_SUPER_RANK = 4;

export type MembershipTranslate = (key: string, defaultValue?: string) => string;

export interface RemoteMembershipPackage {
  readonly description?: string;
  readonly durationDays?: number | string;
  readonly id?: number | string;
  readonly levelName?: string;
  readonly name?: string;
  readonly originalPrice?: number | string;
  readonly planName?: string;
  readonly planRank?: number | string;
  readonly pointAmount?: number | string;
  readonly price?: number | string;
  readonly recommended?: boolean;
  readonly sortWeight?: number | string;
  readonly tags?: readonly string[];
}

export interface RemoteMembershipPackageGroup {
  readonly billingCycle?: string | null;
  readonly description?: string;
  readonly durationDays?: number | string;
  readonly id?: number | string;
  readonly name?: string;
  readonly packages?: readonly RemoteMembershipPackage[];
  readonly sortWeight?: number | string;
}

export interface RemoteMembershipPlan {
  readonly id?: number | string;
  readonly name?: string;
  readonly rank?: number | string;
}

export interface RemoteMembershipBenefit {
  readonly benefitKey?: string;
  readonly description?: string;
  readonly displayValue?: string;
  readonly id?: number | string;
  readonly name?: string;
  readonly type?: string;
  readonly usageLimit?: number | string;
}

export interface MembershipBillingCycle {
  readonly discountLabel?: string;
  readonly label: string;
}

export interface MembershipPlanFeature {
  /** Renders the check glyph muted instead of hidden (PC `emptyCheck`). */
  readonly mutedCheck?: boolean;
  readonly tag?: string;
  readonly text: string;
}

export interface MembershipPlanCard {
  readonly discountTag?: string;
  readonly features: readonly MembershipPlanFeature[];
  readonly id: string;
  readonly isCurrentPlan: boolean;
  readonly membershipTierKey: string;
  readonly name: string;
  readonly originalPriceLabel: string;
  readonly packageId: number;
  /** Plan rank the package grants; drives the purchase/upgrade action. */
  readonly planRank: number;
  readonly periodLabel: string;
  readonly pointsAllowanceLabel: string;
  readonly pointsConversionLabel: string;
  readonly priceLabel: string;
  readonly recommended: boolean;
  readonly subtitle: string;
}

export interface MembershipTierColumn {
  readonly buttonLabel: string;
  readonly isCurrentPlan: boolean;
  readonly membershipTierKey: string;
  readonly name: string;
  readonly originalPriceLabel?: string;
  readonly packageId: number;
  readonly planRank: number;
  readonly periodLabel: string;
  readonly priceLabel: string;
}

export type MembershipComparisonCell = boolean | string;

export interface MembershipComparisonRow {
  readonly benefitLabel: string;
  readonly values: readonly MembershipComparisonCell[];
}

export interface MembershipComparisonCategory {
  readonly categoryLabel: string;
  readonly rows: readonly MembershipComparisonRow[];
}

export interface MembershipMemberSummary {
  readonly membershipTierKey: string;
  readonly planRank: number | null;
}

interface PlanRankDisplay {
  readonly membershipTierKey: string;
  readonly nameKey: string;
  readonly tierColumnNameKey: string;
}

/**
 * Rank → tier display. Mirrors the PC definition, including the shared `peak`
 * tier key for ranks 2 and 3; the H5 surfaces additionally compare the concrete
 * rank so a rank-3 member is not blocked from buying rank 2 and vice versa.
 *
 * The comparison-table column names reuse the plan-card names: the PC table
 * labels ranks 2/3 as 标准会员/高级会员 while its cards call the same levels
 * 高级会员/巅峰会员, which reads as two different levels on one screen. The
 * mobile surface shows one name per level.
 */
const PLAN_RANK_DISPLAY: Readonly<Record<number, PlanRankDisplay>> = {
  1: { membershipTierKey: 'pro', nameKey: 'plan.basic', tierColumnNameKey: 'plan.basic' },
  2: { membershipTierKey: 'peak', nameKey: 'plan.pro', tierColumnNameKey: 'plan.pro' },
  3: { membershipTierKey: 'peak', nameKey: 'plan.peak', tierColumnNameKey: 'plan.peak' },
  4: { membershipTierKey: 'super', nameKey: 'plan.super', tierColumnNameKey: 'plan.super' },
};

const DEFAULT_PLAN_DISPLAY = PLAN_RANK_DISPLAY[1];

interface ComparisonBenefitRow {
  readonly categoryKey: string;
  readonly categoryLabel: string;
  readonly labelKey: string;
  readonly label: string;
  readonly valueForRank: (
    rank: number,
    benefits: readonly RemoteMembershipBenefit[],
    t: MembershipTranslate,
  ) => MembershipComparisonCell;
}

function findBenefit(
  benefits: readonly RemoteMembershipBenefit[],
  benefitKey: string,
): RemoteMembershipBenefit | undefined {
  return benefits.find((benefit) => toSdkworkMembershipOptionalString(benefit.benefitKey) === benefitKey);
}

function hasActiveBenefit(
  benefits: readonly RemoteMembershipBenefit[],
  benefitKey: string,
): boolean {
  const benefit = findBenefit(benefits, benefitKey);
  if (!benefit) return false;
  const displayValue = toSdkworkMembershipOptionalString(benefit.displayValue);
  if (displayValue) return true;
  const usageLimit = toNullableSdkworkMembershipNumber(benefit.usageLimit);
  return Boolean(usageLimit && usageLimit > 0);
}

function findBenefitDisplayValue(
  benefits: readonly RemoteMembershipBenefit[],
  benefitKey: string,
): string | undefined {
  const benefit = findBenefit(benefits, benefitKey);
  if (!benefit) return undefined;
  return toSdkworkMembershipOptionalString(benefit.displayValue);
}

/** Data first, then the rank-based fallback the PC comparison table uses. */
function booleanValueWithFallback(
  benefits: readonly RemoteMembershipBenefit[],
  benefitKey: string,
  rank: number,
): MembershipComparisonCell {
  if (hasActiveBenefit(benefits, benefitKey)) return true;
  if (rank >= CLOUDROUTER_MEMBERSHIP_SUPER_RANK) return true;
  return rank > 0;
}

function textValueWithFallback(
  benefits: readonly RemoteMembershipBenefit[],
  benefitKey: string,
  rank: number,
  fallback: () => string,
): MembershipComparisonCell {
  const value = findBenefitDisplayValue(benefits, benefitKey);
  if (value) return value;
  return fallback();
}

/**
 * Benefit comparison matrix.
 *
 * The benefit keys, categories, row labels, and rank fallbacks are the Cloud
 * Router membership definition shared with the PC `/token-plan` page; the row
 * count and order must stay identical so both surfaces describe the same
 * membership.
 */
const COMPARE_BENEFIT_ROWS: readonly ComparisonBenefitRow[] = [
  {
    categoryKey: 'compare.category.points',
    categoryLabel: '算力积分',
    labelKey: 'compare.row.platformFreePoints',
    label: '平台免费算力积分',
    valueForRank: (rank, benefits, t) =>
      textValueWithFallback(benefits, 'platform_free_points', rank, () =>
        rank === 0
          ? t('compare.value.dailyLoginFree', '每日登陆免费算力积分')
          : t('compare.value.dailyLoginGift', '每日登录赠送算力积分')),
  },
  {
    categoryKey: 'compare.category.points',
    categoryLabel: '算力积分',
    labelKey: 'compare.row.purchasedPoints',
    label: '充值购买算力积分',
    valueForRank: (rank, benefits) => booleanValueWithFallback(benefits, 'purchased_points', rank),
  },
  {
    categoryKey: 'compare.category.points',
    categoryLabel: '算力积分',
    labelKey: 'compare.row.memberPoints',
    label: '订阅会员算力积分',
    valueForRank: (rank, benefits, t) => {
      if (rank <= 0 && !hasActiveBenefit(benefits, 'daily_points')) {
        return '-';
      }
      if (
        rank >= CLOUDROUTER_MEMBERSHIP_SUPER_RANK
        && !hasActiveBenefit(benefits, 'daily_points')
      ) {
        // Inherited PC token-plan fallback for an unseeded top tier: without it
        // the paid super level would render as having no monthly credits.
        return t('compare.value.superMonthly', '每月7,499算力积分');
      }
      const benefit = findBenefit(benefits, 'daily_points');
      const quantity = toNullableSdkworkMembershipNumber(benefit?.usageLimit);
      if (!quantity) {
        return '-';
      }
      return t('compare.value.monthlyPoints', '每月{amount}算力积分')
        .replace('{amount}', formatSdkworkMembershipPoints(quantity, 'zh-CN'));
    },
  },
  {
    categoryKey: 'compare.category.video',
    categoryLabel: '视频生成',
    labelKey: 'compare.row.seedanceVip',
    label: 'seedance2.0 VIP模型',
    valueForRank: (rank, benefits) => booleanValueWithFallback(benefits, 'seedance_vip_model', rank),
  },
  {
    categoryKey: 'compare.category.video',
    categoryLabel: '视频生成',
    labelKey: 'compare.row.seedancePro',
    label: 'seedance1.5 Pro模型',
    valueForRank: (rank, benefits, t) =>
      textValueWithFallback(benefits, 'seedance_pro_model', rank, () =>
        rank === 0 ? '-' : t('compare.value.discount80', '8折算力积分')),
  },
  {
    categoryKey: 'compare.category.video',
    categoryLabel: '视频生成',
    labelKey: 'compare.row.videoQueue',
    label: '视频生成专享加速',
    valueForRank: (rank, benefits, t) => {
      for (const key of ['vip_queue', 'fast_queue', 'standard_queue']) {
        const value = findBenefitDisplayValue(benefits, key);
        if (value) return value;
      }
      if (rank <= 0) return '-';
      if (rank >= CLOUDROUTER_MEMBERSHIP_SUPER_RANK) {
        return t('compare.value.fastChannel', '快速生成通道');
      }
      return rank <= 2
        ? t('compare.value.standardChannel', '标准生成通道')
        : t('compare.value.fastChannel', '快速生成通道');
    },
  },
  {
    categoryKey: 'compare.category.video',
    categoryLabel: '视频生成',
    labelKey: 'compare.row.videoLipSync',
    label: '视频对口型',
    valueForRank: (rank, benefits) => booleanValueWithFallback(benefits, 'video_lip_sync', rank),
  },
  {
    categoryKey: 'compare.category.video',
    categoryLabel: '视频生成',
    labelKey: 'compare.row.videoHd',
    label: '视频高清',
    valueForRank: (rank, benefits) => booleanValueWithFallback(benefits, 'video_hd', rank),
  },
  {
    categoryKey: 'compare.category.video',
    categoryLabel: '视频生成',
    labelKey: 'compare.row.videoFrameInterp',
    label: '视频补帧',
    valueForRank: (rank, benefits) => booleanValueWithFallback(benefits, 'video_frame_interp', rank),
  },
  {
    categoryKey: 'compare.category.image',
    categoryLabel: '图片生成',
    labelKey: 'compare.row.imageFree',
    label: '图片 4.0 限时免费',
    valueForRank: (rank, benefits, t) =>
      textValueWithFallback(benefits, 'image_4k_free', rank, () => {
        if (rank <= 0) return '-';
        if (rank >= CLOUDROUTER_MEMBERSHIP_SUPER_RANK) return '2K/4K';
        return rank <= 2 ? '2K' : '2K/4K';
      }),
  },
  {
    categoryKey: 'compare.category.image',
    categoryLabel: '图片生成',
    labelKey: 'compare.row.smartUpscale',
    label: '智能超清',
    valueForRank: (rank, benefits, t) =>
      textValueWithFallback(benefits, 'smart_upscale', rank, () => {
        if (rank <= 0) return '-';
        if (rank >= CLOUDROUTER_MEMBERSHIP_SUPER_RANK) return '4K/8K';
        return rank <= 2 ? '4K' : '4K/8K';
      }),
  },
  {
    categoryKey: 'compare.category.global',
    categoryLabel: '全局能力',
    labelKey: 'compare.row.noWatermark',
    label: '去除品牌水印',
    valueForRank: (rank, benefits) => booleanValueWithFallback(benefits, 'no_watermark', rank),
  },
  {
    categoryKey: 'compare.category.global',
    categoryLabel: '全局能力',
    labelKey: 'compare.row.generationAcceleration',
    label: '生成加速',
    valueForRank: (rank, benefits) =>
      booleanValueWithFallback(benefits, 'generation_acceleration', rank),
  },
  {
    categoryKey: 'compare.category.global',
    categoryLabel: '全局能力',
    labelKey: 'compare.row.worryFreeRefund',
    label: '无忧退款',
    valueForRank: (rank, benefits) => booleanValueWithFallback(benefits, 'vip_support', rank),
  },
];

/**
 * Resolves the plan rank a purchasable package grants.
 *
 * Wire order: the package's own `planRank` (authoritative when present), then a
 * case-sensitive plan-name match against the served plan catalog, then the
 * Chinese level-name heuristics the PC definition uses for legacy rows.
 */
export function resolvePlanRankFromPackage(
  pkg: RemoteMembershipPackage,
  plans: readonly RemoteMembershipPlan[],
): number {
  const wireRank = toNullableSdkworkMembershipNumber(pkg.planRank);
  if (wireRank !== null && wireRank > 0) {
    return wireRank;
  }

  const planName = toSdkworkMembershipOptionalString(pkg.planName ?? pkg.levelName);
  if (planName) {
    const matchedPlan = plans.find((plan) => toSdkworkMembershipOptionalString(plan.name) === planName);
    if (matchedPlan) {
      return toSdkworkMembershipNumber(matchedPlan.rank ?? matchedPlan.id);
    }
    return resolvePlanRankFromLevelText(planName);
  }

  return resolvePlanRankFromLevelText(toSdkworkMembershipOptionalString(pkg.name) ?? '');
}

function resolvePlanRankFromLevelText(value: string): number {
  if (!value) return 0;
  if (value.includes('基础')) return 1;
  if (value.includes('标准')) return 2;
  if (value.includes('高级')) return 3;
  if (value.includes('超级') || value.includes('巅峰')) return 4;
  return 0;
}

/** Billing cycles are the package groups, ordered by weight then id. */
export function sortMembershipPackageGroups(
  groups: readonly RemoteMembershipPackageGroup[],
): RemoteMembershipPackageGroup[] {
  return [...groups].sort(
    (left, right) =>
      toSdkworkMembershipNumber(left.sortWeight) - toSdkworkMembershipNumber(right.sortWeight)
      || toSdkworkMembershipNumber(left.id) - toSdkworkMembershipNumber(right.id),
  );
}

/** Billing cycles are the package groups, ordered by weight then id. */
export function mapPackageGroupsToBillingCycles(
  groups: readonly RemoteMembershipPackageGroup[],
): MembershipBillingCycle[] {
  return sortMembershipPackageGroups(groups).map((group) => ({
    ...(toSdkworkMembershipOptionalString(group.description)
      ? { discountLabel: toSdkworkMembershipOptionalString(group.description) }
      : {}),
    label: toSdkworkMembershipOptionalString(group.name) ?? 'Subscription',
  }));
}

/** Sort the packages of one billing cycle by their catalog weight. */
export function sortMembershipPackages(
  packages: readonly RemoteMembershipPackage[],
): RemoteMembershipPackage[] {
  return [...packages].sort(
    (left, right) =>
      toSdkworkMembershipNumber(left.sortWeight) - toSdkworkMembershipNumber(right.sortWeight)
      || toSdkworkMembershipNumber(left.id) - toSdkworkMembershipNumber(right.id),
  );
}

export function resolvePeriodLabel(durationDays: number, t: MembershipTranslate): string {
  if (durationDays >= 365) {
    return t('period.year', '每年');
  }
  if (durationDays >= 90) {
    return t('period.quarter', '每季');
  }
  return t('period.month', '每月');
}

/** Monthlyized membership points allowance, matching the PC card math. */
export function resolveMonthlyPointAllowance(pointAmount: number, durationDays: number): number {
  if (durationDays >= 365) {
    return Math.max(1, Math.round(pointAmount / 12));
  }
  if (durationDays >= 90) {
    return Math.max(1, Math.round(pointAmount / 3));
  }
  return pointAmount;
}

/** Plan-card feature templates by plan rank (same rows as the PC cards). */
export function resolveFeatureTemplates(
  rank: number,
  t: MembershipTranslate,
): MembershipPlanFeature[] {
  if (rank === 1) {
    return [
      { tag: t('feature.limit3', '3个'), text: t('feature.agentLimit', '智能体上限') },
      { tag: t('feature.unlimited', '无限制'), text: t('feature.dailyMatch', '每日匹配次数') },
      { tag: t('feature.free', 'Free'), text: t('feature.standardChannel', '标准算力通道') },
      { text: t('feature.regularEvents', '参与常规赛事') },
      { text: t('feature.worryFreeRefund', 'Worry-free Refund') },
    ];
  }

  if (rank === 2) {
    return [
      { tag: t('feature.limit10', '10个'), text: t('feature.agentLimit', '智能体上限') },
      { tag: t('feature.unlimited', '无限制'), text: t('feature.dailyMatch', '每日匹配次数') },
      { tag: t('feature.free', 'Free'), text: t('feature.advancedAssistant', '进阶AI助手') },
      {
        mutedCheck: true,
        tag: t('feature.free', 'Free'),
        text: t('feature.advancedChannel', '高级算力通道'),
      },
      { text: t('feature.exclusiveEvents', '创建专属赛事') },
      { text: t('feature.worryFreeRefund', 'Worry-free Refund') },
      { text: t('feature.mallDiscount', '商城专属折扣') },
    ];
  }

  if (rank >= CLOUDROUTER_MEMBERSHIP_SUPER_RANK) {
    return [
      { tag: t('feature.infinite', '无限'), text: t('feature.agentLimit', '智能体上限') },
      { tag: t('feature.unlimited', '无限制'), text: t('feature.dailyMatch', '每日匹配次数') },
      { tag: t('feature.priority', 'Priority'), text: t('feature.fastMatch', 'Fast Match') },
      { tag: t('feature.free', 'Free'), text: t('feature.quantumChannel', 'Quantum Compute Channel') },
      { text: t('feature.globalEvents', 'Host Global Tournaments') },
      { text: t('feature.worryFreeRefund', 'Worry-free Refund') },
      { text: t('feature.superEffects', 'Super Exclusive Effects') },
    ];
  }

  return [
    { tag: t('feature.infinite', '无限'), text: t('feature.agentLimit', '智能体上限') },
    { tag: t('feature.unlimited', '无限制'), text: t('feature.dailyMatch', '每日匹配次数') },
    { tag: t('feature.priority', 'Priority'), text: t('feature.fastMatch', 'Fast Match') },
    { tag: t('feature.free', 'Free'), text: t('feature.peakChannel', '巅峰算力通道') },
    { text: t('feature.hostOfficialEvents', '主办官方赛事') },
    { text: t('feature.worryFreeRefund', 'Worry-free Refund') },
    { text: t('feature.peakEffects', '巅峰专属特效') },
  ];
}

export function formatMembershipPriceLabel(value: number | null): string {
  if (value === null) {
    return '--';
  }
  return (
    formatMoney(value, {
      currency: 'CNY',
      locale: 'zh-CN',
      mode: 'symbol',
      minFractionDigits: 0,
      maxFractionDigits: 2,
    }) ?? formatSdkworkMembershipPoints(value, 'zh-CN')
  );
}

export function formatMembershipOriginalPriceLabel(value: number | null): string {
  if (value === null) return '';
  return (
    formatMoney(value, {
      currency: 'CNY',
      locale: 'zh-CN',
      mode: 'symbol',
      minFractionDigits: 0,
      maxFractionDigits: 2,
    }) ?? ''
  );
}

function isCurrentPlanForSummary(
  rank: number,
  membershipTierKey: string,
  summary: MembershipMemberSummary | null,
): boolean {
  if (!summary) return false;
  if (summary.planRank !== null) {
    return rank > 0 && summary.planRank === rank;
  }
  return summary.membershipTierKey === membershipTierKey;
}

/**
 * Builds the mobile plan cards for one billing cycle.
 *
 * All displayed values (price, original price, period, monthly points, points
 * conversion, feature rows) come from the same catalog fields and the same math
 * as the PC token-plan cards.
 */
export function mapPackagesToPlanCards(
  packages: readonly RemoteMembershipPackage[],
  plans: readonly RemoteMembershipPlan[],
  memberSummary: MembershipMemberSummary | null,
  t: MembershipTranslate,
): MembershipPlanCard[] {
  return sortMembershipPackages(packages).map((pkg) => {
    const packageNumericId = toSdkworkMembershipNumber(pkg.id);
    const rank = resolvePlanRankFromPackage(pkg, plans);
    const display = PLAN_RANK_DISPLAY[rank] ?? DEFAULT_PLAN_DISPLAY;
    const priceCny = toNullableSdkworkMembershipNumber(pkg.price);
    const originalPriceCny = toNullableSdkworkMembershipNumber(pkg.originalPrice);
    const pointAmount = toSdkworkMembershipNumber(pkg.pointAmount);
    const durationDays = toSdkworkMembershipNumber(pkg.durationDays, 30);
    const isCurrentPlan = isCurrentPlanForSummary(
      rank,
      display.membershipTierKey,
      memberSummary,
    );
    const priceLabel = formatMembershipPriceLabel(priceCny);
    const originalPriceLabel = originalPriceCny
      ? formatMembershipOriginalPriceLabel(originalPriceCny)
      : '';
    const discountTag = Array.isArray(pkg.tags) ? pkg.tags[0] : undefined;
    const monthlyPoints = resolveMonthlyPointAllowance(pointAmount, durationDays);

    return {
      ...(discountTag ? { discountTag } : {}),
      features: resolveFeatureTemplates(rank, t),
      id: String(packageNumericId),
      isCurrentPlan,
      membershipTierKey: display.membershipTierKey,
      name: t(display.nameKey, pkg.name ?? 'Membership'),
      originalPriceLabel,
      packageId: packageNumericId,
      planRank: rank,
      periodLabel: resolvePeriodLabel(durationDays, t),
      pointsAllowanceLabel: t('points.perMonth', '{amount} 算力积分/月').replace(
        '{amount}',
        formatSdkworkMembershipPoints(monthlyPoints, 'zh-CN'),
      ),
      pointsConversionLabel: priceCny
        ? t('points.conversion', '换算¥10={amount}算力积分').replace(
          '{amount}',
          String(Math.max(1, Math.round((pointAmount / Math.max(priceCny, 1)) * 10))),
        )
        : '',
      priceLabel,
      recommended: Boolean(pkg.recommended),
      subtitle: pkg.description ?? '',
    };
  });
}

/** Tier columns for the comparison header (one per purchasable package). */
export function mapPackagesToTierColumns(
  packages: readonly RemoteMembershipPackage[],
  plans: readonly RemoteMembershipPlan[],
  memberSummary: MembershipMemberSummary | null,
  t: MembershipTranslate,
): MembershipTierColumn[] {
  return sortMembershipPackages(packages).map((pkg) => {
    const packageNumericId = toSdkworkMembershipNumber(pkg.id);
    const rank = resolvePlanRankFromPackage(pkg, plans);
    const display = PLAN_RANK_DISPLAY[rank] ?? DEFAULT_PLAN_DISPLAY;
    const priceCny = toNullableSdkworkMembershipNumber(pkg.price);
    const originalPriceCny = toNullableSdkworkMembershipNumber(pkg.originalPrice);
    const durationDays = toSdkworkMembershipNumber(pkg.durationDays, 30);
    const isCurrentPlan = isCurrentPlanForSummary(
      rank,
      display.membershipTierKey,
      memberSummary,
    );
    const priceLabel = formatMembershipPriceLabel(priceCny);
    const originalPriceLabel = originalPriceCny
      ? formatMembershipOriginalPriceLabel(originalPriceCny)
      : undefined;

    return {
      buttonLabel: isCurrentPlan ? t('cta.currentPlan', '当前计划') : t('cta.select', '选择'),
      isCurrentPlan,
      membershipTierKey: display.membershipTierKey,
      name: t(display.tierColumnNameKey, pkg.name ?? 'Membership'),
      ...(originalPriceLabel ? { originalPriceLabel } : {}),
      packageId: packageNumericId,
      planRank: rank,
      periodLabel: resolvePeriodLabel(durationDays, t),
      priceLabel,
    };
  });
}

export function buildComparisonCategories(
  benefitsByRank: Readonly<Record<number, readonly RemoteMembershipBenefit[]>>,
  t: MembershipTranslate,
): MembershipComparisonCategory[] {
  const categories = new Map<string, { categoryLabel: string; rows: MembershipComparisonRow[] }>();

  for (const row of COMPARE_BENEFIT_ROWS) {
    const category = categories.get(row.categoryKey) ?? {
      categoryLabel: t(row.categoryKey, row.categoryLabel),
      rows: [],
    };
    category.rows.push({
      benefitLabel: t(row.labelKey, row.label),
      values: [0, 1, 2, 3, CLOUDROUTER_MEMBERSHIP_SUPER_RANK].map((rank) =>
        row.valueForRank(rank, benefitsByRank[rank] ?? [], t),
      ),
    });
    categories.set(row.categoryKey, category);
  }

  return [...categories.values()];
}

export function resolveMemberSummaryFromPlanRank(
  planRank: number | null,
): MembershipMemberSummary {
  if (planRank === null || planRank <= 0) {
    return { membershipTierKey: 'free', planRank: planRank ?? 0 };
  }
  return {
    membershipTierKey: PLAN_RANK_DISPLAY[planRank]?.membershipTierKey ?? 'pro',
    planRank,
  };
}

/** Name of the membership level currently held, for the mobile status card. */
export function resolveMemberLevelNameFromPlanRank(
  planRank: number | null,
  t: MembershipTranslate,
): string {
  if (planRank === null || planRank <= 0) {
    return t('level.none', '未开通会员');
  }
  const display = PLAN_RANK_DISPLAY[planRank];
  return display
    ? t(display.nameKey, t('plan.basic', '基础会员'))
    : t('level.member', '会员');
}
