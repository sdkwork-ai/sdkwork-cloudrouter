import type { MembershipTranslate } from '../catalog/membershipDefinition.js';
import type { TeamPackage, TeamPackageGroup } from './teamContract.js';

/** Team billing cycles in the order the mobile cycle rail shows them. */
export type TeamBillingCycle = 'month' | 'once' | 'quarter' | 'year';

const TEAM_BILLING_CYCLE_ORDER: readonly TeamBillingCycle[] = ['year', 'month', 'quarter', 'once'];

export interface TeamSeatBounds {
  readonly max: number;
  readonly min: number;
}

export interface TeamPlanGroup {
  readonly key: string;
  readonly planId: string;
  readonly planName: string;
  readonly planRank: number;
  readonly packages: readonly TeamPackage[];
  readonly recommended: boolean;
  readonly sortWeight: number;
}

export interface TeamCycleOption {
  readonly billingCycle: TeamBillingCycle | null;
  readonly description?: string;
  readonly durationDays?: number;
  readonly groupId?: string;
  readonly key: string;
  readonly label: string;
  readonly packages: readonly TeamPackage[];
}

function toPositiveInteger(value: string | number | undefined, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

/** Seat bounds a team package allows; min defaults to 1, max to min. */
export function resolveTeamSeatBounds(pkg: Pick<TeamPackage, 'seatMin' | 'seatMax'>): TeamSeatBounds {
  const min = Math.max(1, toPositiveInteger(pkg.seatMin, 1));
  const max = Math.max(min, toPositiveInteger(pkg.seatMax, min));
  return { max, min };
}

export function clampTeamSeatCount(seats: number, bounds: TeamSeatBounds): number {
  if (!Number.isFinite(seats)) {
    return bounds.min;
  }
  const truncated = Math.trunc(seats);
  if (truncated <= bounds.min) return bounds.min;
  if (truncated >= bounds.max) return bounds.max;
  return truncated;
}

/** Default subscribe seat count: the purchased amount clamped into the bounds. */
export function resolveDefaultTeamSeatCount(
  bounds: TeamSeatBounds,
  purchasedSeats: number,
): number {
  const purchased = Number.isFinite(purchasedSeats) ? Math.trunc(purchasedSeats) : 0;
  return clampTeamSeatCount(Math.max(bounds.min, purchased || bounds.min), bounds);
}

export function resolveAdditionalSeatBounds(bounds: TeamSeatBounds): TeamSeatBounds {
  return { max: Math.max(1, bounds.max), min: 1 };
}

/** Default add-seat count: 5 seats (the PC default), clamped into the plan. */
export function resolveDefaultAdditionalSeatCount(bounds: TeamSeatBounds): number {
  return clampTeamSeatCount(Math.max(5, bounds.min), resolveAdditionalSeatBounds(bounds));
}

/** Digits-only seat input; empty input falls back to the minimum. */
export function parseTeamSeatInput(text: string, bounds: TeamSeatBounds): number {
  const digits = text.replaceAll(/[^0-9]/gu, '');
  return digits === '' ? bounds.min : toPositiveInteger(digits, bounds.min);
}

/** Per-seat price × seats, rounded to cents (PC formula). */
export function computeTeamSeatTotal(unitPrice: number, seats: number): number {
  if (!Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(seats) || seats <= 0) {
    return 0;
  }
  return Math.round(unitPrice * seats * 100) / 100;
}

export function formatTeamCnyAmount(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `¥${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Number.isInteger(safe) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(safe) ? 0 : 2,
  }).format(safe)}`;
}

export function toTeamBillingCycle(value: string | null | undefined): TeamBillingCycle | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'month' || normalized === 'once' || normalized === 'quarter'
    || normalized === 'year'
    ? normalized
    : null;
}

/** The billing-cycle suffix shown after a unit price ("每年", "每月", …). */
export function resolveTeamPeriodLabel(
  cycle: TeamBillingCycle | null,
  t: MembershipTranslate,
): string {
  switch (cycle) {
    case 'year':
      return t('team.period.year', '每年');
    case 'quarter':
      return t('team.period.quarter', '每季');
    case 'once':
      return t('team.period.once', '单月');
    default:
      return t('team.period.month', '每月');
  }
}

/** Groups team packages by plan; the first package of a plan is its card. */
export function groupTeamPlanPackages(packages: readonly TeamPackage[]): TeamPlanGroup[] {
  const groups = new Map<string, TeamPackage[]>();
  for (const pkg of packages) {
    const planId = pkg.planId?.trim();
    const key = planId && planId.length > 0 ? planId : pkg.id;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(pkg);
    } else {
      groups.set(key, [pkg]);
    }
  }
  return [...groups.entries()]
    .map(([key, planPackages]) => {
      const sorted = [...planPackages].sort(
        (left, right) =>
          toPositiveInteger(left.sortWeight, 0) - toPositiveInteger(right.sortWeight, 0)
          || left.id.localeCompare(right.id),
      );
      const head = sorted[0];
      const planRank = toPositiveInteger(head?.planRank, Number.MAX_SAFE_INTEGER);
      const planName = head?.planName?.trim() || head?.name.trim() || key;
      return {
        key,
        planId: key,
        planName,
        planRank,
        packages: sorted,
        recommended: sorted.some((pkg) => pkg.recommended),
        sortWeight: toPositiveInteger(head?.sortWeight, 0),
      };
    })
    .sort(
      (left, right) =>
        left.planRank - right.planRank
        || left.sortWeight - right.sortWeight
        || left.planName.localeCompare(right.planName),
    );
}

function fallbackCycleLabel(cycle: TeamBillingCycle | null, t: MembershipTranslate): string {
  switch (cycle) {
    case 'year':
      return t('team.cycle.year', '连续包年');
    case 'quarter':
      return t('team.cycle.quarter', '连续包季');
    case 'once':
      return t('team.cycle.once', '单月购买');
    default:
      return t('team.cycle.month', '连续包月');
  }
}

/**
 * Billing-cycle tabs for the team plan cards.
 *
 * Package groups are the authority; when the group read is unavailable the
 * packages are bucketed by `recurrenceCycle` so the surface never renders zero
 * tabs (PC fallback rule).
 */
export function buildTeamCycleOptions(
  packages: readonly TeamPackage[],
  groups: readonly TeamPackageGroup[],
  t: MembershipTranslate,
): TeamCycleOption[] {
  const knownIds = new Set(packages.map((pkg) => pkg.id));
  if (groups.length > 0) {
    return groups.map((group) => ({
      billingCycle: toTeamBillingCycle(group.billingCycle),
      ...(group.description?.trim() ? { description: group.description.trim() } : {}),
      ...(toPositiveInteger(group.durationDays, 0) > 0
        ? { durationDays: toPositiveInteger(group.durationDays, 0) }
        : {}),
      groupId: group.id,
      key: group.id,
      label: group.name.trim() || group.id,
      packages: knownIds.size > 0
        ? group.packages.filter((pkg) => knownIds.has(pkg.id))
        : group.packages,
    }));
  }

  const buckets = new Map<string, TeamPackage[]>();
  for (const pkg of packages) {
    const cycle = toTeamBillingCycle(pkg.recurrenceCycle);
    const key = cycle ?? 'other';
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(pkg);
    } else {
      buckets.set(key, [pkg]);
    }
  }
  return [...buckets.entries()]
    .map(([key, bucket]) => {
      const cycle = toTeamBillingCycle(key);
      return {
        billingCycle: cycle,
        key,
        label: fallbackCycleLabel(cycle, t),
        packages: bucket,
      };
    })
    .sort((left, right) => {
      const leftIndex = left.billingCycle
        ? TEAM_BILLING_CYCLE_ORDER.indexOf(left.billingCycle)
        : TEAM_BILLING_CYCLE_ORDER.length;
      const rightIndex = right.billingCycle
        ? TEAM_BILLING_CYCLE_ORDER.indexOf(right.billingCycle)
        : TEAM_BILLING_CYCLE_ORDER.length;
      return leftIndex - rightIndex;
    });
}

/** Selects the package of a plan that belongs to the active cycle option. */
export function selectTeamPlanPackage(
  group: TeamPlanGroup,
  option: TeamCycleOption | undefined,
): TeamPackage | null {
  if (!option) {
    return group.packages[0] ?? null;
  }
  if (option.groupId) {
    const byGroup = group.packages.find((pkg) => pkg.packageGroupId === option.groupId);
    if (byGroup) return byGroup;
  }
  if (option.billingCycle) {
    const byCycle = group.packages.find(
      (pkg) => toTeamBillingCycle(pkg.recurrenceCycle) === option.billingCycle,
    );
    if (byCycle) return byCycle;
  }
  return group.packages[0] ?? null;
}
