import type { CloudRouterH5CommerceServices } from '@sdkwork/cloudrouter-h5-core/sdk';
import {
  getCloudRouterH5CommerceServices,
  hasCloudRouterCommerceSession,
  selectCloudRouterOrganization,
  toSdkworkAccountPointsFromMicro,
  unwrapSdkworkAccountResource,
  unwrapSdkworkMembershipPageItems,
  unwrapSdkworkMembershipResponse,
} from '@sdkwork/cloudrouter-h5-core/sdk';
import {
  toNullableSdkworkMembershipNumber,
  toSdkworkMembershipOptionalString,
} from '@sdkwork/membership-service';

import type {
  RemoteMembershipBenefit,
  RemoteMembershipPackageGroup,
  RemoteMembershipPlan,
} from './catalog/membershipDefinition.js';
import {
  TEAM_ROSTER_PAGE_SIZE,
  TEAM_SEAT_MAX_PAGES,
  TEAM_SEAT_PAGE_SIZE,
  TeamSubscriptionError,
  normalizeMembershipKind,
  normalizeTeamError,
  parseOwnMemberships,
  readTeamPackageNumericId,
  type TeamCheckoutAction,
  type TeamMembershipKind,
  type TeamOwnMembership,
  type TeamPackage,
  type TeamPackageGroup,
  type TeamRosterMember,
  type TeamRosterPage,
  type TeamRosterQuery,
  type TeamSeatAssignment,
  type TeamSeatAssignmentResult,
  type TeamSeatPolicyInput,
  type TeamSeatReconciliation,
  type TeamSubscriptionOverview,
} from './team/teamContract.js';

/**
 * Host-injected data plane for the Cloud Router H5 membership surfaces.
 *
 * The screens never call a transport directly: the runtime owns the catalog,
 * member status, Token Bank balance, checkout, recharge, and redemption calls.
 * The default runtime (`createCloudRouterMembershipRuntime`) binds the H5
 * commerce services; tests and alternate hosts can inject their own.
 */
export interface MembershipCatalogSnapshot {
  readonly benefitsByRank: Readonly<Record<number, readonly RemoteMembershipBenefit[]>>;
  readonly groups: readonly RemoteMembershipPackageGroup[];
  readonly plans: readonly RemoteMembershipPlan[];
}

export interface MembershipMemberProfile {
  readonly active: boolean;
  readonly expiresAt?: string;
  /** Served level name, when the backend provides one. */
  readonly levelName?: string;
  readonly planRank: number | null;
  readonly remainingDays: number | null;
}

export interface MembershipRechargePackage {
  readonly bonusPoints: number;
  readonly currencyCode: string;
  readonly id: string;
  /** Package price in major currency units (render with a currency formatter). */
  readonly priceAmount: number;
  /** Credited compute credits in whole points (converted from the wire micro unit). */
  readonly points: number;
}

export type MembershipPaymentMethod = 'alipay' | 'wechat_pay';

export interface MembershipOrderInput {
  readonly packageId: number;
  readonly paymentMethod: MembershipPaymentMethod;
  readonly targetPlanRank: number;
}

export interface MembershipRechargeOrderInput {
  readonly packageId: string;
  readonly paymentMethod: MembershipPaymentMethod;
}

export interface MembershipOrderOutcome {
  readonly amountCny: number | null;
  readonly cashierUrl?: string;
  readonly durationDays?: number | null;
  readonly orderId?: string;
  readonly packageName?: string;
  readonly status: 'completed' | 'failed' | 'pending';
  readonly targetPlanName?: string;
}

export interface MembershipRechargeOutcome {
  readonly amountCny: number | null;
  readonly cashierUrl?: string;
  readonly orderId?: string;
  readonly points: number;
  readonly status: 'completed' | 'failed' | 'pending';
}

export interface MembershipRedeemOutcome {
  readonly benefitKind: 'cash_credit' | 'points_credit' | 'subscription' | 'token_bank_credit';
  readonly grantAmount?: number;
  readonly grantPoints?: number;
  readonly status: 'completed' | 'pending';
}

export interface MembershipTeamCatalog {
  readonly groups: readonly TeamPackageGroup[];
  readonly packages: readonly TeamPackage[];
}

export interface MembershipTeamCheckoutInput {
  readonly action: TeamCheckoutAction;
  readonly packageId: string;
  readonly paymentMethod: MembershipPaymentMethod;
  /** `purchase` sends the total seats; `add_seats` sends the seats to add. */
  readonly seats: number;
}

export interface CloudRouterH5MembershipRuntime {
  /** Creates one membership order and returns the cashier hand-off. */
  createMembershipOrder(input: MembershipOrderInput): Promise<MembershipOrderOutcome>;
  /** Creates one Token Bank compute-credit recharge order. */
  createRechargeOrder(input: MembershipRechargeOrderInput): Promise<MembershipRechargeOutcome>;
  loadCatalog(): Promise<MembershipCatalogSnapshot>;
  loadMemberProfile(): Promise<MembershipMemberProfile | null>;
  loadRechargePackages(): Promise<readonly MembershipRechargePackage[]>;
  /** Spendable Token Bank compute credits, or null when unavailable. */
  loadTokenBankBalance(): Promise<number | null>;
  redeemCode(code: string): Promise<MembershipRedeemOutcome>;
  readonly signedIn: boolean;

  // ── Organization (team) membership ──────────────────────────────────────
  /** Assigns the lowest free seat to an active organization member. */
  assignTeamSeat(userId: string): Promise<TeamSeatAssignmentResult>;
  /** Binds the caller's unbound team subscription to an organization. */
  bindTeamOrganization(organizationId: string): Promise<TeamSubscriptionOverview>;
  /** Creates one team membership order (purchase or add-seats) for the cashier. */
  createTeamCheckout(input: MembershipTeamCheckoutInput): Promise<MembershipOrderOutcome>;
  /** The caller's own IAM organization memberships (authoritative org + role). */
  loadOwnTeamMemberships(): Promise<readonly TeamOwnMembership[]>;
  /** Display name of an organization, or undefined when it is not readable. */
  loadTeamOrganizationName(organizationId: string): Promise<string | undefined>;
  /** Every active organization (team) token package and its billing-cycle groups. */
  loadTeamCatalog(): Promise<MembershipTeamCatalog>;
  /** Current organization team subscription overview. */
  loadTeamOverview(): Promise<TeamSubscriptionOverview>;
  /** One page of the IAM-owned organization roster. */
  loadTeamRoster(query: TeamRosterQuery): Promise<TeamRosterPage>;
  /** Active seat assignments paged internally up to `seatLimit` rows. */
  loadTeamSeatAssignments(seatLimit: number): Promise<readonly TeamSeatAssignment[]>;
  /** Reconciles the seat ledger with the IAM-owned roster. */
  reconcileTeamSeats(): Promise<TeamSeatReconciliation>;
  /** Revokes an organization member's active seat. */
  revokeTeamSeat(userId: string): Promise<void>;
  /** Switches the session to another organization; a fresh sign-in may be required. */
  switchTeamOrganization(organizationId: string): Promise<void>;
  /** Updates the over-seat policy and returns the refreshed overview. */
  updateTeamSeatPolicy(input: TeamSeatPolicyInput): Promise<TeamSubscriptionOverview>;
}

const CATALOG_PAGE_QUERY = { page: 1, pageSize: 200, category: 'token' as const };
/** Plan ranks whose benefits drive the comparison matrix (0 = free tier). */
const BENEFIT_RANKS = [0, 1, 2, 3, 4] as const;

function normalizeOrderStatus(status: unknown): 'completed' | 'failed' | 'pending' {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'paid' || normalized === 'success') {
    return 'completed';
  }
  if (normalized === 'failed' || normalized === 'cancelled' || normalized === 'canceled'
    || normalized === 'closed' || normalized === 'expired') {
    return 'failed';
  }
  return 'pending';
}

async function loadBenefitsByRank(
  services: CloudRouterH5CommerceServices,
): Promise<Record<number, RemoteMembershipBenefit[]>> {
  // Benefits are catalog data and publicly readable; a rejected rank (for
  // example an unseeded upper tier) degrades to the static comparison fallbacks
  // instead of failing the whole page.
  const entries = await Promise.all(
    BENEFIT_RANKS.map(async (rank) => {
      try {
        const payload = await services.membership.memberships.benefits.list({
          ...CATALOG_PAGE_QUERY,
          planId: String(rank),
        });
        return [rank, unwrapSdkworkMembershipPageItems<RemoteMembershipBenefit>(payload)] as const;
      } catch {
        return [rank, [] as RemoteMembershipBenefit[]] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

function toTeamNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toTeamOptionalInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Normalizes wire seats/status so the mobile summary can trust the numbers. */
function normalizeTeamOverview(raw: TeamSubscriptionOverview): TeamSubscriptionOverview {
  return {
    autoAssignSeat: raw.autoAssignSeat === true,
    hasSubscription: raw.hasSubscription === true,
    organizationId: typeof raw.organizationId === 'string' ? raw.organizationId : '',
    seatPolicy: raw.seatPolicy === 'flex_overflow' ? 'flex_overflow' : 'strict',
    seatsAvailable: toTeamNumber(raw.seatsAvailable),
    seatsPurchased: toTeamNumber(raw.seatsPurchased),
    seatsUsed: toTeamNumber(raw.seatsUsed),
    ...(raw.expiresAt ? { expiresAt: raw.expiresAt } : {}),
    ...(raw.organizationBindingStatus === 'bound' || raw.organizationBindingStatus === 'unbound'
      ? { organizationBindingStatus: raw.organizationBindingStatus }
      : {}),
    ...(raw.planId ? { planId: String(raw.planId) } : {}),
    ...(raw.planName ? { planName: raw.planName } : {}),
    ...(raw.planRank ? { planRank: String(raw.planRank) } : {}),
    ...(raw.startsAt ? { startsAt: raw.startsAt } : {}),
    ...(raw.status ? { status: raw.status } : {}),
    ...(raw.subscriptionId ? { subscriptionId: raw.subscriptionId } : {}),
  };
}

function normalizeTeamPackage(raw: TeamPackage): TeamPackage {
  return {
    ...raw,
    id: String(raw.id),
    planId: String(raw.planId ?? ''),
    planRank: String(raw.planRank ?? ''),
    price: String(raw.price ?? '0'),
    recommended: raw.recommended === true,
    seatMax: String(raw.seatMax ?? ''),
    seatMin: String(raw.seatMin ?? '1'),
    seatPointsAmount: String(raw.seatPointsAmount ?? '0'),
    sortWeight: String(raw.sortWeight ?? '0'),
  };
}

function normalizeTeamGroup(raw: TeamPackageGroup): TeamPackageGroup {
  return {
    ...raw,
    id: String(raw.id),
    name: raw.name ?? '',
    packages: (raw.packages ?? []).map(normalizeTeamPackage),
  };
}

function normalizeTeamAssignment(raw: TeamSeatAssignment): TeamSeatAssignment {
  return { ...raw, seatNo: toTeamNumber(raw.seatNo) };
}

function readOrganizationRecordName(
  record: Record<string, unknown>,
  organizationId: string,
): string | undefined {
  const id = record.id ?? record.organizationId;
  if (id !== organizationId) {
    return undefined;
  }
  const name = [record.name, record.displayName]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return name?.trim();
}

function searchOrganizationName(
  value: unknown,
  organizationId: string,
  depth: number,
): string | undefined {
  if (depth > 6 || value === null || typeof value !== 'object') {
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = searchOrganizationName(entry, organizationId, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const direct = readOrganizationRecordName(record, organizationId);
  if (direct) return direct;
  for (const entry of Object.values(record)) {
    const found = searchOrganizationName(entry, organizationId, depth + 1);
    if (found) return found;
  }
  return undefined;
}

interface MembershipPage<T> {
  readonly items: readonly T[];
  readonly pageInfo?: { readonly hasMore?: boolean } | null;
}

async function collectMembershipPages<T>(
  fetchPage: (page: number) => Promise<MembershipPage<T>>,
  maxPages: number,
): Promise<T[]> {
  const collected: T[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchPage(page);
    collected.push(...result.items);
    if (result.pageInfo?.hasMore !== true) {
      break;
    }
  }
  return collected;
}

/**
 * Binds the membership runtime to the H5 commerce services.
 *
 * The catalog, member status, and Token Bank reads are the same domain calls the
 * PC `/token-plan` page makes; the checkout and recharge commands use the
 * mobile cashier product (`mobile_cashier_h5`) so a phone buyer is handed to the
 * H5 cashier route instead of a desktop QR code.
 */
export function createCloudRouterMembershipRuntime(
  services: CloudRouterH5CommerceServices,
): CloudRouterH5MembershipRuntime {
  const loadMemberProfile = async (): Promise<MembershipMemberProfile | null> => {
    if (!hasCloudRouterCommerceSession()) {
      return null;
    }

    try {
      const info = unwrapSdkworkMembershipResponse<{
        expiresAt?: string;
        membershipStatus?: string;
        planName?: string;
        planRank?: unknown;
        remainingDays?: unknown;
      } | null>(await services.membership.memberships.current.retrieve());
      if (!info) {
        return null;
      }
      const planRank = toNullableSdkworkMembershipNumber(info.planRank) ?? 0;
      const status = toSdkworkMembershipOptionalString(info.membershipStatus)?.toLowerCase();
      const expired = status === 'expired' || status === 'inactive' || status === 'none';
      const levelName = toSdkworkMembershipOptionalString(info.planName);
      return {
        active: planRank > 0 && !expired,
        ...(toSdkworkMembershipOptionalString(info.expiresAt)
          ? { expiresAt: toSdkworkMembershipOptionalString(info.expiresAt) }
          : {}),
        ...(levelName ? { levelName } : {}),
        planRank: planRank > 0 ? planRank : null,
        remainingDays: toNullableSdkworkMembershipNumber(info.remainingDays),
      };
    } catch {
      // The info projection needs an active subscription; fall back to the
      // status projection, which answers for any signed-in account.
      try {
        const status = unwrapSdkworkMembershipResponse<{
          active?: boolean;
          expiresAt?: string;
          planRank?: unknown;
        } | null>(await services.membership.memberships.current.status.retrieve());
        const planRank = toNullableSdkworkMembershipNumber(status?.planRank) ?? 0;
        const active = Boolean(status?.active) && planRank > 0;
        return {
          active,
          ...(toSdkworkMembershipOptionalString(status?.expiresAt)
            ? { expiresAt: toSdkworkMembershipOptionalString(status?.expiresAt) }
            : {}),
          planRank: planRank > 0 ? planRank : null,
          remainingDays: null,
        };
      } catch {
        return null;
      }
    }
  };

  return {
    async createMembershipOrder(input) {
      const profile = await loadMemberProfile().catch(() => null);
      const currentRank = profile?.active ? profile.planRank ?? 0 : 0;
      const action = currentRank > 0
        ? input.targetPlanRank > currentRank
          ? 'upgrade'
          : 'renew'
        : 'purchase';
      const payment = await services.membershipCheckout.createCheckout({
        action,
        packageId: input.packageId,
        paymentMethod: input.paymentMethod,
        paymentProduct: 'mobile_cashier_h5',
      });
      const cashierUrl = toSdkworkMembershipOptionalString(payment.cashierUrl);
      const orderId = toSdkworkMembershipOptionalString(payment.orderId);
      const packageName = toSdkworkMembershipOptionalString(payment.packageName);
      const targetPlanName = toSdkworkMembershipOptionalString(payment.targetLevelName);
      return {
        amountCny: payment.amountCny,
        ...(cashierUrl ? { cashierUrl } : {}),
        durationDays: payment.durationDays,
        ...(orderId ? { orderId } : {}),
        ...(packageName ? { packageName } : {}),
        status: normalizeOrderStatus(payment.status),
        ...(targetPlanName ? { targetPlanName } : {}),
      };
    },

    async createRechargeOrder(input) {
      const payment = await services.tokenBankRecharge.createOrder({
        packageId: input.packageId,
        paymentMethod: input.paymentMethod,
        paymentProduct: 'mobile_cashier_h5',
        source: 'cloudrouter-h5-membership',
      });
      const cashierUrl = toSdkworkMembershipOptionalString(payment.cashierUrl);
      const orderId = toSdkworkMembershipOptionalString(payment.orderId);
      return {
        amountCny: payment.amountCny,
        ...(cashierUrl ? { cashierUrl } : {}),
        ...(orderId ? { orderId } : {}),
        points: toSdkworkAccountPointsFromMicro(payment.points),
        status: normalizeOrderStatus(payment.status),
      };
    },

    async loadCatalog() {
      const [groupsPayload, plansPayload, benefitsByRank] = await Promise.all([
        services.membership.memberships.packageGroups.list(CATALOG_PAGE_QUERY),
        services.membership.memberships.plans.list(CATALOG_PAGE_QUERY),
        loadBenefitsByRank(services),
      ]);
      return {
        benefitsByRank,
        groups: unwrapSdkworkMembershipPageItems<RemoteMembershipPackageGroup>(groupsPayload),
        plans: unwrapSdkworkMembershipPageItems<RemoteMembershipPlan>(plansPayload),
      };
    },

    loadMemberProfile,

    async loadRechargePackages() {
      const packages = await services.tokenBankRecharge.listPackages();
      // The order catalog serializes credited points as micro-points (1 point =
      // 1e6); every surface must divide once, exactly like the PC recharge
      // dialog does with `sdkworkTokenBankPointsMicroToDecimal`.
      return packages.map((item) => ({
        bonusPoints: toSdkworkAccountPointsFromMicro(item.bonusPoints),
        currencyCode: item.currencyCode,
        id: item.id,
        points: toSdkworkAccountPointsFromMicro(item.points),
        priceAmount: item.priceAmount,
      }));
    },

    async loadTokenBankBalance() {
      if (!hasCloudRouterCommerceSession()) {
        return null;
      }
      try {
        const account = unwrapSdkworkAccountResource<{ availableAmount?: unknown }>(
          await services.account.tokenBank.account.retrieve(),
        );
        return toSdkworkAccountPointsFromMicro(account?.availableAmount);
      } catch {
        return null;
      }
    },

    async redeemCode(code) {
      const result = await services.couponRecharge.redeem(code);
      const status = normalizeOrderStatus(result.status);
      return {
        benefitKind: result.benefitKind,
        ...('grantAmount' in result && typeof result.grantAmount === 'number'
          ? { grantAmount: result.grantAmount }
          : {}),
        ...('grantPoints' in result && typeof result.grantPoints === 'number'
          ? { grantPoints: result.grantPoints }
          : {}),
        status: status === 'failed' ? 'pending' : status,
      };
    },

    // ── Organization (team) membership ────────────────────────────────────

    async assignTeamSeat(userId) {
      try {
        return normalizeTeamAssignment(
          await services.membershipApp.memberships.teamSeats.create({ userId }),
        );
      } catch (cause) {
        throw normalizeTeamError(cause);
      }
    },

    async bindTeamOrganization(organizationId) {
      try {
        return normalizeTeamOverview(
          await services.membershipApp.memberships.teamSubscription.bind({ organizationId }),
        );
      } catch (cause) {
        throw normalizeTeamError(cause);
      }
    },

    async createTeamCheckout(input) {
      // The catalog serves the package id as an int64 string; the order checkout
      // takes a number, so it is accepted only when it round-trips exactly.
      const packageId = readTeamPackageNumericId(input.packageId);
      try {
        const payment = await services.membershipCheckout.createCheckout({
          action: input.action,
          packageId,
          paymentMethod: input.paymentMethod,
          paymentProduct: 'mobile_cashier_h5',
          quantity: input.seats,
        });
        const cashierUrl = toSdkworkMembershipOptionalString(payment.cashierUrl);
        const orderId = toSdkworkMembershipOptionalString(payment.orderId);
        const packageName = toSdkworkMembershipOptionalString(payment.packageName);
        const targetPlanName = toSdkworkMembershipOptionalString(payment.targetLevelName);
        return {
          amountCny: payment.amountCny,
          ...(cashierUrl ? { cashierUrl } : {}),
          durationDays: payment.durationDays,
          ...(orderId ? { orderId } : {}),
          ...(packageName ? { packageName } : {}),
          status: normalizeOrderStatus(payment.status),
          ...(targetPlanName ? { targetPlanName } : {}),
        };
      } catch (cause) {
        throw normalizeTeamError(cause);
      }
    },

    async loadOwnTeamMemberships() {
      try {
        const page = await services.iamApp.iam.organizationMemberships.list({ pageSize: 200 });
        return parseOwnMemberships(page.items);
      } catch (cause) {
        throw normalizeTeamError(cause);
      }
    },

    async loadTeamOrganizationName(organizationId) {
      const normalized = organizationId.trim();
      if (!normalized) {
        return undefined;
      }
      try {
        const page = await services.iamApp.iam.organizations.list({ pageSize: 200 });
        for (const item of page.items) {
          const name = readOrganizationRecordName(item, normalized);
          if (name) return name;
        }
      } catch {
        // Permission-gated read: fall through to the tree projection.
      }
      try {
        return searchOrganizationName(
          await services.iamApp.iam.organizations.tree.retrieve(),
          normalized,
          0,
        );
      } catch {
        return undefined;
      }
    },

    async loadTeamCatalog() {
      try {
        const [packages, groups] = await Promise.all([
          collectMembershipPages(
            (page) => services.membershipApp.memberships.packages.list({
              audience: 'team',
              category: 'token',
              page,
              pageSize: 200,
            }),
            5,
          ),
          collectMembershipPages(
            (page) => services.membershipApp.memberships.packageGroups.list({
              audience: 'team',
              category: 'token',
              page,
              pageSize: 200,
            }),
            5,
          ),
        ]);
        return {
          groups: groups.map(normalizeTeamGroup),
          packages: packages.map(normalizeTeamPackage),
        };
      } catch (cause) {
        throw normalizeTeamError(cause);
      }
    },

    async loadTeamOverview() {
      try {
        return normalizeTeamOverview(
          await services.membershipApp.memberships.teamSubscription.retrieve(),
        );
      } catch (cause) {
        throw normalizeTeamError(cause);
      }
    },

    async loadTeamRoster(query) {
      try {
        const page = await services.iamApp.iam.organizations.members.list(query.organizationId, {
          page: query.page,
          pageSize: query.pageSize,
          ...(query.q?.trim() ? { q: query.q.trim() } : {}),
        });
        const items: TeamRosterMember[] = page.items.map((member) => ({
          ...(member.displayName ? { displayName: member.displayName } : {}),
          ...(member.email ? { email: member.email } : {}),
          membershipId: member.membershipId,
          membershipKind: normalizeMembershipKind(member.membershipKind) ?? 'member',
          userId: member.userId,
          ...(member.username ? { username: member.username } : {}),
        }));
        return {
          hasMore: page.pageInfo?.hasMore === true,
          items,
          page: page.pageInfo?.page ?? query.page,
          pageSize: page.pageInfo?.pageSize ?? query.pageSize,
          total: toTeamOptionalInt(page.pageInfo?.totalItems) ?? items.length,
        };
      } catch (cause) {
        throw normalizeTeamError(cause);
      }
    },

    async loadTeamSeatAssignments(seatLimit) {
      const cap = Math.max(1, Math.trunc(seatLimit));
      const collected: TeamSeatAssignment[] = [];
      try {
        for (let page = 1; page <= TEAM_SEAT_MAX_PAGES; page += 1) {
          const result = await services.membershipApp.memberships.teamSeats.list({
            page,
            pageSize: TEAM_SEAT_PAGE_SIZE,
          });
          collected.push(...result.items.map(normalizeTeamAssignment));
          if (result.pageInfo?.hasMore !== true || collected.length >= cap) {
            break;
          }
        }
        return collected.slice(0, cap);
      } catch (cause) {
        throw normalizeTeamError(cause);
      }
    },

    async reconcileTeamSeats() {
      try {
        const result = await services.membershipApp.memberships.teamSeats.reconcile();
        return {
          revokedCount: toTeamNumber(result.revokedCount),
          seatsPurchased: toTeamNumber(result.seatsPurchased),
          seatsUsed: toTeamNumber(result.seatsUsed),
        };
      } catch (cause) {
        throw normalizeTeamError(cause);
      }
    },

    async revokeTeamSeat(userId) {
      try {
        await services.membershipApp.memberships.teamSeats.delete(userId);
      } catch (cause) {
        throw normalizeTeamError(cause);
      }
    },

    async switchTeamOrganization(organizationId) {
      try {
        const issued = await selectCloudRouterOrganization(organizationId);
        if (!issued) {
          throw new TeamSubscriptionError(
            'organization_sign_in_required',
            'This platform requires choosing the organization at sign-in.',
            400,
          );
        }
      } catch (cause) {
        throw normalizeTeamError(cause);
      }
    },

    async updateTeamSeatPolicy(input) {
      try {
        return normalizeTeamOverview(
          await services.membershipApp.memberships.teamSeats.policy.update({
            autoAssignSeat: input.autoAssignSeat,
            seatPolicy: input.seatPolicy,
          }),
        );
      } catch (cause) {
        throw normalizeTeamError(cause);
      }
    },

    get signedIn() {
      return hasCloudRouterCommerceSession();
    },
  };
}

let membershipRuntime: CloudRouterH5MembershipRuntime | null = null;

/** Wires the host membership data plane for the subscription surfaces. */
export function configureCloudRouterH5MembershipRuntime(
  nextRuntime: CloudRouterH5MembershipRuntime | null,
): void {
  membershipRuntime = nextRuntime;
}

/** Returns the injected runtime, or `null` when the host did not compose one. */
export function getCloudRouterH5MembershipRuntime(): CloudRouterH5MembershipRuntime | null {
  return membershipRuntime;
}

/** Bootstrap entry: binds the runtime to the H5 commerce services once. */
export function bootstrapCloudRouterH5Membership(): CloudRouterH5MembershipRuntime {
  const runtime = membershipRuntime ?? createCloudRouterMembershipRuntime(getCloudRouterH5CommerceServices());
  membershipRuntime = runtime;
  return runtime;
}

/** Test seam: restores the unconfigured package state. */
export function resetCloudRouterH5MembershipRuntime(): void {
  membershipRuntime = null;
}
