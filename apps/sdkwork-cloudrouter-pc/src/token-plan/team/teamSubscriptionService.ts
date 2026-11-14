import { getCloudRouterMembershipCheckoutService } from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';
import {
  getSdkworkAppbaseAppSdkClient,
  getSdkworkMembershipAppSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import type { SdkworkMembershipCheckoutPayment } from '@sdkwork/order-service';

import {
  composeTeamSeatComposition,
  parseOwnMemberships,
  resolveTeamOrganizationId,
  resolveTeamViewerRole,
  type TeamOwnMembership,
  type TeamRosterMember,
  type TeamRosterPage,
  type TeamSeatComposition,
} from './teamRosterComposition.ts';

/**
 * The only module that touches the organization (team) subscription SDK, the
 * IAM directory SDK, and the order-owned membership checkout.
 *
 * Ownership split: membership publishes membership-owned facts (the team
 * subscription overview and the seat assignment rows); the organization roster,
 * the caller's role, and the member count are IAM-owned and read through the
 * published IAM app SDK. This module composes both fact sets so the page and the
 * seat directory never build an SDK client, never assemble request headers, and
 * never parse a problem body.
 *
 * Generated types are derived from the composed SDK clients so this package does
 * not hand-copy either wire contract.
 */

type TeamMembershipsApi = ReturnType<typeof getSdkworkMembershipAppSdkClient>['memberships'];
type IamDirectoryApi = ReturnType<typeof getSdkworkAppbaseAppSdkClient>['iam'];

/** Organization (team) subscription overview (`GET /memberships/team/subscription`). */
export type TeamSubscriptionOverview = Awaited<
  ReturnType<TeamMembershipsApi['teamSubscription']['retrieve']>
>;

/** One active seat assignment (`GET /memberships/team/seats`). */
export type TeamSeatAssignment = Awaited<
  ReturnType<TeamMembershipsApi['teamSeats']['list']>
>['items'][number];

/** Result of assigning a seat (`POST /memberships/team/seats`). */
export type TeamSeatAssignmentResult = Awaited<
  ReturnType<TeamMembershipsApi['teamSeats']['create']>
>;

/** Result of a member-removal seat reconciliation (`POST /memberships/team/seats/reconcile`). */
export type TeamSeatReconciliationResult = Awaited<
  ReturnType<TeamMembershipsApi['teamSeats']['reconcile']>
>;

/** Organization (team) package catalog item (`GET /memberships/packages`). */
export type TeamPlanPackage = Awaited<
  ReturnType<TeamMembershipsApi['packages']['list']>
>['items'][number];

/** Over-seat policy accepted by the seat policy endpoint. */
export type TeamSeatPolicy = TeamSubscriptionOverview['seatPolicy'];

/** Everything the team page renders: membership facts plus derived IAM facts. */
export interface TeamSeatSnapshot {
  composition: TeamSeatComposition;
  overview: TeamSubscriptionOverview;
  seatAssignments: TeamSeatAssignment[];
}

/**
 * Reasons the backend attaches as `ProblemDetail.reason` for team seat
 * failures. Every entry is a string the app API actually sends
 * (`sdkwork-membership` `crates/sdkwork-routes-membership-app-api/src/router.rs`);
 * the union never invents a client-only code.
 */
export const TEAM_PLAN_ERROR_REASONS = [
  'seat_capacity_exceeded',
  'seat_already_assigned',
  'not_organization_member',
  'seat_management_forbidden',
  'team_subscription_inactive',
  'last_seat_owner_required',
  'seat_assignment_not_found',
  'organization_scope_required',
] as const;

/** Machine-readable reason for a team seat/subscription failure. */
export type TeamPlanErrorReason =
  | (typeof TEAM_PLAN_ERROR_REASONS)[number]
  | 'unauthenticated'
  | 'unknown';

/** Normalized team plan failure; components map `reason` to localized copy. */
export class TeamPlanServiceError extends Error {
  readonly httpStatus: number | undefined;
  readonly reason: TeamPlanErrorReason;

  constructor(reason: TeamPlanErrorReason, message: string, httpStatus?: number) {
    super(message);
    this.name = 'TeamPlanServiceError';
    this.reason = reason;
    this.httpStatus = httpStatus;
  }
}

/** Team checkout payment, owned by the order checkout service contract. */
export type TeamCheckoutPayment = SdkworkMembershipCheckoutPayment;

/**
 * Membership lifecycle action a team checkout can start.
 *
 * `add_seats` buys additional seats for the organization's existing active team
 * subscription: it never extends the period (`renew` does that) and never
 * creates a second subscription.
 */
export type TeamCheckoutAction = 'purchase' | 'renew' | 'add_seats';

export interface StartTeamCheckoutInput {
  action: TeamCheckoutAction;
  /** Catalog package id as served by the team package list (int64 string). */
  packageId: string;
  /**
   * Seat count sent as the order `quantity`.
   *
   * `purchase` sends the total seat count; `add_seats` sends the number of seats
   * to ADD to the current subscription.
   */
  seats: number;
}

export interface TeamSeatPolicyInput {
  autoAssignSeat: boolean;
  seatPolicy: TeamSeatPolicy;
}

export interface TeamRosterPageQuery {
  organizationId: string;
  page: number;
  pageSize: number;
  q?: string;
}

const TEAM_PACKAGE_PAGE_SIZE = 200;
const TEAM_PACKAGE_MAX_PAGES = 5;
/** IAM caps an organization roster page at 200 rows. */
const TEAM_ROSTER_PAGE_SIZE = 200;
/** Bounded roster walk for the derived member totals (200 x 10 = 2000 members). */
const TEAM_ROSTER_MAX_PAGES = 10;
const TEAM_SEAT_PAGE_SIZE = 100;
const TEAM_SEAT_MAX_PAGES = 20;
const UNAUTHORIZED_PLATFORM_CODE = 40101;

type ProblemRecord = {
  code?: number | string;
  detail?: string;
  reason?: unknown;
  status?: number;
};

function readProblemRecord(error: unknown): ProblemRecord | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const candidate = (error as { problem?: unknown }).problem;
  return candidate && typeof candidate === 'object' ? (candidate as ProblemRecord) : undefined;
}

function readHttpStatus(error: unknown, problem: ProblemRecord | undefined): number | undefined {
  const direct = error && typeof error === 'object'
    ? (error as { httpStatus?: unknown }).httpStatus
    : undefined;
  if (typeof direct === 'number' && Number.isFinite(direct)) {
    return direct;
  }
  if (typeof problem?.status === 'number' && Number.isFinite(problem.status)) {
    return problem.status;
  }
  if (problem?.code === UNAUTHORIZED_PLATFORM_CODE) {
    return 401;
  }
  return undefined;
}

function readErrorMessage(error: unknown, problem: ProblemRecord | undefined): string {
  const detail = typeof problem?.detail === 'string' ? problem.detail.trim() : '';
  if (detail.length > 0) {
    return detail;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Team subscription request failed.';
}

function readReason(problem: ProblemRecord | undefined): string {
  return typeof problem?.reason === 'string' ? problem.reason.trim() : '';
}

/**
 * Normalizes any thrown value into a typed team plan failure.
 *
 * The app API attaches `ProblemDetail.reason` for seat rejections and keeps the
 * numeric platform code for everything else, so both are read here and nowhere
 * else.
 */
export function normalizeTeamPlanError(error: unknown): TeamPlanServiceError {
  if (error instanceof TeamPlanServiceError) {
    return error;
  }
  const problem = readProblemRecord(error);
  const httpStatus = readHttpStatus(error, problem);
  const message = readErrorMessage(error, problem);
  if (httpStatus === 401) {
    return new TeamPlanServiceError('unauthenticated', message, httpStatus);
  }
  const rawReason = readReason(problem);
  const known = TEAM_PLAN_ERROR_REASONS.find((reason) => reason === rawReason);
  return new TeamPlanServiceError(known ?? 'unknown', message, httpStatus);
}

/**
 * The composed checkout input takes a numeric package id. Accept the catalog's
 * int64 string only when it round-trips exactly, so a seat checkout can never
 * target a precision-truncated package.
 */
function toTeamPackageNumericId(packageId: string): number {
  const normalized = packageId.trim();
  const numeric = Number(normalized);
  if (
    normalized.length === 0
    || !/^\d+$/.test(normalized)
    || !Number.isSafeInteger(numeric)
    || numeric <= 0
    || String(numeric) !== normalized
  ) {
    throw new TeamPlanServiceError(
      'unknown',
      `Team subscription package id is not a valid catalog id: ${packageId}`,
    );
  }
  return numeric;
}

function teamMemberships(): TeamMembershipsApi {
  return getSdkworkMembershipAppSdkClient().memberships;
}

function iamDirectory(): IamDirectoryApi {
  return getSdkworkAppbaseAppSdkClient().iam;
}

/** Current organization team subscription overview. */
export async function getTeamOverview(): Promise<TeamSubscriptionOverview> {
  try {
    return await teamMemberships().teamSubscription.retrieve();
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

/** Assigns the lowest free seat to an active organization member. */
export async function assignTeamSeat(userId: string): Promise<TeamSeatAssignmentResult> {
  try {
    return await teamMemberships().teamSeats.create({ userId });
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

/** Revokes an organization member's active seat. */
export async function revokeTeamSeat(userId: string): Promise<void> {
  try {
    await teamMemberships().teamSeats.delete(userId);
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

/**
 * Reconciles the seat ledger with the IAM-owned roster.
 *
 * IAM owns organization membership, so membership never decides on its own
 * whether an assigned user left the organization: the endpoint asks the IAM
 * directory port and revokes every assignment whose user is no longer an active
 * member. `revokedCount` is 0 on a repeat call (the operation is idempotent).
 */
export async function reconcileTeamSeats(): Promise<TeamSeatReconciliationResult> {
  try {
    return await teamMemberships().teamSeats.reconcile();
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

/** Updates the over-seat policy and returns the refreshed overview. */
export async function updateTeamSeatPolicy(
  policy: TeamSeatPolicyInput,
): Promise<TeamSubscriptionOverview> {
  try {
    return await teamMemberships().teamSeats.policy.update({
      autoAssignSeat: policy.autoAssignSeat,
      seatPolicy: policy.seatPolicy,
    });
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

/**
 * The active seat assignments, paged up to `seatLimit` rows.
 *
 * Membership owns the assignment rows, so this is a pure membership read. The
 * snapshot loader starts it together with the overview and the caller's own IAM
 * membership, then bounds the set by the purchased seat count once the overview
 * reports it.
 */
export async function listTeamSeatAssignments(seatLimit: number): Promise<TeamSeatAssignment[]> {
  try {
    const memberships = teamMemberships();
    const cap = Math.max(1, Math.trunc(seatLimit));
    const collected: TeamSeatAssignment[] = [];
    for (let page = 1; page <= TEAM_SEAT_MAX_PAGES; page += 1) {
      const result = await memberships.teamSeats.list({
        page,
        pageSize: TEAM_SEAT_PAGE_SIZE,
      });
      collected.push(...result.items);
      if (result.pageInfo?.hasMore !== true || collected.length >= cap) {
        break;
      }
    }
    return collected.slice(0, cap);
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

function readTotalItems(pageInfo: { totalItems?: string } | undefined, fallback: number): number {
  const parsed = Number.parseInt(pageInfo?.totalItems ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** One page of the IAM-owned organization roster, searched with `q`. */
export async function listTeamRosterPage(
  query: TeamRosterPageQuery,
): Promise<TeamRosterPage> {
  try {
    const result = await iamDirectory().organizations.members.list(query.organizationId, {
      page: query.page,
      pageSize: query.pageSize,
      ...(query.q?.trim() ? { q: query.q.trim() } : {}),
    });
    const items: TeamRosterMember[] = result.items;
    return {
      hasMore: result.pageInfo?.hasMore === true,
      items,
      page: result.pageInfo?.page ?? query.page,
      pageSize: result.pageInfo?.pageSize ?? query.pageSize,
      total: readTotalItems(result.pageInfo, items.length),
    };
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

/**
 * Walks the IAM organization roster for the derived member totals.
 *
 * Pages are 200 rows (the IAM cap) and the walk is bounded so a pathological
 * organization cannot stall the team page.
 */
export async function loadTeamRoster(organizationId: string): Promise<{
  items: TeamRosterMember[];
  total: number;
}> {
  try {
    const directory = iamDirectory();
    const items: TeamRosterMember[] = [];
    let total = 0;
    for (let page = 1; page <= TEAM_ROSTER_MAX_PAGES; page += 1) {
      const result = await directory.organizations.members.list(organizationId, {
        page,
        pageSize: TEAM_ROSTER_PAGE_SIZE,
      });
      items.push(...result.items);
      total = Math.max(total, readTotalItems(result.pageInfo, items.length));
      if (result.pageInfo?.hasMore !== true) {
        break;
      }
    }
    return { items, total: total > 0 ? total : items.length };
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

/** The caller's own IAM organization memberships (authoritative organization). */
export async function listOwnOrganizationMemberships(): Promise<TeamOwnMembership[]> {
  try {
    const result = await iamDirectory().organizationMemberships.list({
      pageSize: TEAM_ROSTER_PAGE_SIZE,
    });
    return parseOwnMemberships(result.items);
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

function readOrganizationName(
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
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const direct = readOrganizationName(record, organizationId);
  if (direct) {
    return direct;
  }
  for (const entry of Object.values(record)) {
    const found = searchOrganizationName(entry, organizationId, depth + 1);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/**
 * Displays the organization name from the IAM directory when it is readable.
 *
 * Both IAM reads are permission-gated, so a failure here is not fatal: the page
 * falls back to the organization id and never blocks the seat surface.
 */
export async function loadOrganizationName(organizationId: string): Promise<string | undefined> {
  const directory = iamDirectory();
  try {
    const page = await directory.organizations.list({ pageSize: TEAM_ROSTER_PAGE_SIZE });
    for (const item of page.items) {
      const name = readOrganizationName(item, organizationId);
      if (name) {
        return name;
      }
    }
  } catch {
    // Fall through to the tree read; the caller has a display fallback.
  }
  try {
    const tree = await directory.organizations.tree.retrieve();
    return searchOrganizationName(tree, organizationId, 0);
  } catch {
    return undefined;
  }
}

/**
 * Loads the complete team page state in two parallel stages.
 *
 * Stage one fetches the membership overview, the membership seat assignments,
 * and the caller's own IAM membership at the same time. Stage two runs once the
 * organization id (authoritative from IAM) and the purchased seat bound are
 * known, and fetches the IAM roster walk and the organization name in parallel.
 */
export async function loadTeamSeatSnapshot(): Promise<TeamSeatSnapshot> {
  const [overview, ownMemberships, seatAssignments] = await Promise.all([
    getTeamOverview(),
    listOwnOrganizationMemberships(),
    listTeamSeatAssignments(TEAM_SEAT_PAGE_SIZE * TEAM_SEAT_MAX_PAGES),
  ]);

  const organizationId = resolveTeamOrganizationId(ownMemberships, overview.organizationId);
  const seatLimit = Math.max(1, overview.seatsPurchased, overview.seatsUsed);
  const boundedSeatAssignments = seatAssignments.slice(0, seatLimit);
  const [roster, organizationName] = await Promise.all([
    loadTeamRoster(organizationId),
    loadOrganizationName(organizationId),
  ]);

  const composition = composeTeamSeatComposition({
    membersTotal: roster.total,
    organizationId,
    ...(organizationName ? { organizationName } : {}),
    overview,
    roster: roster.items,
    seatAssignments: boundedSeatAssignments,
    viewerRole: resolveTeamViewerRole(ownMemberships, organizationId),
  });

  return {
    composition,
    overview,
    seatAssignments: boundedSeatAssignments,
  };
}

/** Every active organization (team) token package in the catalog. */
export async function listTeamPackages(): Promise<TeamPlanPackage[]> {
  try {
    const memberships = teamMemberships();
    const packages: TeamPlanPackage[] = [];
    for (let page = 1; page <= TEAM_PACKAGE_MAX_PAGES; page += 1) {
      const result = await memberships.packages.list({
        audience: 'team',
        category: 'token',
        page,
        pageSize: TEAM_PACKAGE_PAGE_SIZE,
      });
      packages.push(...result.items);
      if (!result.pageInfo.hasMore) {
        break;
      }
    }
    return packages;
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

/**
 * Starts the order-owned membership checkout for a team plan.
 *
 * `quantity` is the seat count of the requested action: the total seat count for
 * a first `purchase`, or the number of ADDITIONAL seats for `add_seats`.
 */
export async function startTeamCheckout(
  input: StartTeamCheckoutInput,
): Promise<TeamCheckoutPayment> {
  try {
    return await getCloudRouterMembershipCheckoutService().createCheckout({
      // `add_seats` grows the existing subscription; only `purchase` starts one.
      action: input.action,
      packageId: toTeamPackageNumericId(input.packageId),
      // Seats to ADD when expanding, the total seat count when subscribing.
      quantity: input.seats,
      paymentMethod: 'WECHAT',
      paymentProduct: 'mobile_cashier_h5',
    });
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

/** Polls one team checkout order through the same order-owned service. */
export async function getTeamCheckoutStatus(orderId: string): Promise<TeamCheckoutPayment> {
  try {
    return await getCloudRouterMembershipCheckoutService().getCheckoutStatus(orderId);
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}
