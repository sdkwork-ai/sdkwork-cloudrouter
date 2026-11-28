import type {
  MembershipsAdminAudience,
  MembershipsAdminPlanItem,
} from './membershipsService';

/**
 * Purchase model of a membership plan.
 *
 * A plan is only sold through packages, and each package carries one recurrence
 * cycle. The plan's purchase model is therefore derived from its package
 * coverage instead of being stored twice:
 *
 * - `subscription` — only renewing cycles (`month` / `quarter` / `year`)
 * - `one_time` — only non-renewing cycles (`once`, plus the prepaid `day` /
 *   `week` passes)
 * - `mixed` — both, i.e. the plan is sold as a subscription and as a one-time
 *   purchase
 * - `unlisted` — no package sells the plan yet
 */
export type MembershipsAdminPurchaseModel = 'subscription' | 'one_time' | 'mixed' | 'unlisted';

/** Filter value for the purchase-model segmented control. */
export type MembershipsAdminPurchaseModelFilter = 'all' | 'subscription' | 'one_time';

/** Audience filter value. */
export type MembershipsAdminAudienceFilter = 'all' | MembershipsAdminAudience;

/** Display order of the catalog audiences. */
export const MEMBERSHIPS_ADMIN_AUDIENCES: MembershipsAdminAudience[] = ['personal', 'team'];

/** Recurring (auto-renewing) cycles. */
export const MEMBERSHIP_SUBSCRIPTION_CYCLES = ['month', 'quarter', 'year'] as const;

/**
 * Non-renewing cycles: `once` is a pure one-time purchase, `day`/`week` are
 * prepaid passes that grant a bounded period without a renewal.
 */
export const MEMBERSHIP_ONE_TIME_CYCLES = ['once', 'day', 'week'] as const;

/** Canonical cycle order used for display and aggregation. */
export const MEMBERSHIP_BILLING_CYCLE_ORDER = [
  'once',
  'day',
  'week',
  'month',
  'quarter',
  'year',
] as const;

/** Options rendered by the purchase-model segmented control. */
export const MEMBERSHIP_PURCHASE_MODEL_FILTERS: Array<{
  value: MembershipsAdminPurchaseModelFilter;
  labelKey: string;
  fallback: string;
}> = [
  { value: 'all', labelKey: 'admin.commerce.memberships.purchaseModel.all', fallback: 'All' },
  { value: 'subscription', labelKey: 'admin.commerce.memberships.purchaseModel.subscription', fallback: 'Subscription' },
  { value: 'one_time', labelKey: 'admin.commerce.memberships.purchaseModel.oneTime', fallback: 'One-time' },
];

/** Options rendered by the audience segmented control. */
export const MEMBERSHIP_AUDIENCE_FILTERS: Array<{
  value: MembershipsAdminAudienceFilter;
  labelKey: string;
  fallback: string;
}> = [
  { value: 'all', labelKey: 'admin.commerce.memberships.audience.all', fallback: 'All audiences' },
  { value: 'personal', labelKey: 'admin.commerce.memberships.audience.personal', fallback: 'Personal' },
  { value: 'team', labelKey: 'admin.commerce.memberships.audience.team', fallback: 'Enterprise' },
];

/** Returns true when a cycle renews without a new buying decision. */
export function isSubscriptionCycle(cycle: string): boolean {
  return (MEMBERSHIP_SUBSCRIPTION_CYCLES as readonly string[]).includes(cycle);
}

/** Returns true when a cycle does not renew. */
export function isOneTimeCycle(cycle: string): boolean {
  return (MEMBERSHIP_ONE_TIME_CYCLES as readonly string[]).includes(cycle);
}

/** De-duplicates and sorts cycles into canonical display order. */
export function normalizeBillingCycles(cycles: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const cycle of cycles) {
    const normalized = cycle.trim().toLowerCase();
    if (normalized) {
      unique.add(normalized);
    }
  }
  return [...unique].sort(
    (left, right) => billingCycleRank(left) - billingCycleRank(right),
  );
}

function billingCycleRank(cycle: string): number {
  const index = (MEMBERSHIP_BILLING_CYCLE_ORDER as readonly string[]).indexOf(cycle);
  return index < 0 ? MEMBERSHIP_BILLING_CYCLE_ORDER.length : index;
}

/**
 * Classifies a plan's purchase model from its package coverage.
 *
 * Unknown cycles count as subscription cycles: treating an unrecognised value as
 * a one-time purchase would silently mislabel a recurring product.
 */
export function classifyPurchaseModel(
  cycles: readonly string[],
): MembershipsAdminPurchaseModel {
  const normalized = normalizeBillingCycles(cycles);
  if (normalized.length === 0) {
    return 'unlisted';
  }
  const hasSubscription = normalized.some((cycle) => !isOneTimeCycle(cycle));
  const hasOneTime = normalized.some((cycle) => isOneTimeCycle(cycle));
  if (hasSubscription && hasOneTime) {
    return 'mixed';
  }
  return hasSubscription ? 'subscription' : 'one_time';
}

/** True when a plan matches the purchase-model filter. */
export function planMatchesPurchaseModel(
  plan: Pick<MembershipsAdminPlanItem, 'billingCycles'>,
  filter: MembershipsAdminPurchaseModelFilter,
): boolean {
  if (filter === 'all') {
    return true;
  }
  const model = classifyPurchaseModel(plan.billingCycles);
  if (model === 'mixed') {
    // A plan sold both ways belongs to both views; hiding it from one of them
    // would make the catalog look incomplete.
    return true;
  }
  return model === filter;
}

/** True when a plan matches the audience filter. */
export function planMatchesAudience(
  plan: Pick<MembershipsAdminPlanItem, 'audience'>,
  filter: MembershipsAdminAudienceFilter,
): boolean {
  return filter === 'all' || plan.audience === filter;
}

/** Applies the client-side taxonomy filters (audience + purchase model + family). */
export function filterPlans(
  plans: readonly MembershipsAdminPlanItem[],
  filters: {
    audience: MembershipsAdminAudienceFilter;
    purchaseModel: MembershipsAdminPurchaseModelFilter;
    category?: string;
  },
): MembershipsAdminPlanItem[] {
  return plans.filter((plan) => (
    planMatchesAudience(plan, filters.audience)
    && planMatchesPurchaseModel(plan, filters.purchaseModel)
    && (!filters.category || filters.category === 'all' || plan.category === filters.category)
  ));
}

export interface MembershipsPlanQuadrant {
  audience: MembershipsAdminAudience;
  purchaseModel: Extract<MembershipsAdminPurchaseModelFilter, 'subscription' | 'one_time'>;
  labelKey: string;
  fallback: string;
  descriptionKey: string;
  descriptionFallback: string;
}

/**
 * The four sellable quadrants of the catalog.
 *
 * This is the primary information architecture of the plans console: audience
 * (who buys) crossed with purchase model (how it is billed).
 */
export const MEMBERSHIP_PLAN_QUADRANTS: MembershipsPlanQuadrant[] = [
  {
    audience: 'personal',
    purchaseModel: 'subscription',
    labelKey: 'admin.commerce.memberships.quadrant.personalSubscription',
    fallback: 'Personal · Subscription',
    descriptionKey: 'admin.commerce.memberships.quadrant.personalSubscriptionHint',
    descriptionFallback: 'Monthly / quarterly / yearly renewal',
  },
  {
    audience: 'personal',
    purchaseModel: 'one_time',
    labelKey: 'admin.commerce.memberships.quadrant.personalOneTime',
    fallback: 'Personal · One-time',
    descriptionKey: 'admin.commerce.memberships.quadrant.personalOneTimeHint',
    descriptionFallback: 'Single settlement, no renewal',
  },
  {
    audience: 'team',
    purchaseModel: 'subscription',
    labelKey: 'admin.commerce.memberships.quadrant.teamSubscription',
    fallback: 'Enterprise · Subscription',
    descriptionKey: 'admin.commerce.memberships.quadrant.teamSubscriptionHint',
    descriptionFallback: 'Per-seat renewal for an organization',
  },
  {
    audience: 'team',
    purchaseModel: 'one_time',
    labelKey: 'admin.commerce.memberships.quadrant.teamOneTime',
    fallback: 'Enterprise · One-time',
    descriptionKey: 'admin.commerce.memberships.quadrant.teamOneTimeHint',
    descriptionFallback: 'Per-seat single settlement',
  },
];

export interface MembershipsPlanSummary {
  total: number;
  personal: number;
  team: number;
  subscription: number;
  oneTime: number;
  unlisted: number;
}

/** Key of one sellable quadrant (`<audience>:<purchaseModel>`). */
export type MembershipsQuadrantKey = `${MembershipsAdminAudience}:${'subscription' | 'one_time'}`;

/**
 * Counts the plans that belong to each sellable quadrant.
 *
 * A `mixed` plan is counted in both purchase models because it is genuinely
 * sold both ways; `unlisted` plans belong to no quadrant and are reported
 * separately by [`summarizePlans`].
 */
export function countPlansByQuadrant(
  plans: readonly Pick<MembershipsAdminPlanItem, 'audience' | 'billingCycles'>[],
): Record<MembershipsQuadrantKey, number> {
  const counts: Record<MembershipsQuadrantKey, number> = {
    'personal:subscription': 0,
    'personal:one_time': 0,
    'team:subscription': 0,
    'team:one_time': 0,
  };
  for (const plan of plans) {
    const model = classifyPurchaseModel(plan.billingCycles);
    const audience = plan.audience === 'team' ? 'team' : 'personal';
    if (model === 'subscription' || model === 'mixed') {
      counts[`${audience}:subscription`] += 1;
    }
    if (model === 'one_time' || model === 'mixed') {
      counts[`${audience}:one_time`] += 1;
    }
  }
  return counts;
}

/** Aggregates the plans currently in view for the summary strip. */
export function summarizePlans(
  plans: readonly Pick<MembershipsAdminPlanItem, 'audience' | 'billingCycles'>[],
): MembershipsPlanSummary {
  const summary: MembershipsPlanSummary = {
    total: plans.length,
    personal: 0,
    team: 0,
    subscription: 0,
    oneTime: 0,
    unlisted: 0,
  };
  for (const plan of plans) {
    if (plan.audience === 'team') {
      summary.team += 1;
    } else {
      summary.personal += 1;
    }
    const model = classifyPurchaseModel(plan.billingCycles);
    if (model === 'subscription' || model === 'mixed') {
      summary.subscription += 1;
    }
    if (model === 'one_time' || model === 'mixed') {
      summary.oneTime += 1;
    }
    if (model === 'unlisted') {
      summary.unlisted += 1;
    }
  }
  return summary;
}

/** Groups plans by audience for the sectioned plan table. */
export function groupPlansByAudience(
  plans: readonly MembershipsAdminPlanItem[],
): Array<{ audience: MembershipsAdminAudience; plans: MembershipsAdminPlanItem[] }> {
  return MEMBERSHIPS_ADMIN_AUDIENCES
    .map((audience) => ({
      audience,
      plans: plans
        .filter((plan) => plan.audience === audience)
        .sort((left, right) => left.rank - right.rank || left.name.localeCompare(right.name)),
    }))
    .filter((group) => group.plans.length > 0);
}
