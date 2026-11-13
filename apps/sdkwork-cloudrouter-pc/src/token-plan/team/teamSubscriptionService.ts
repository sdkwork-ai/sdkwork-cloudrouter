import { getCloudRouterMembershipCheckoutService } from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';
import { getSdkworkMembershipAppSdkClient } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import type { SdkworkMembershipCheckoutPayment } from '@sdkwork/order-service';

/**
 * The only module that touches the organization (team) subscription SDK and the
 * order-owned membership checkout.
 *
 * Components consume the types and functions exported here; they never build an
 * SDK client, never assemble request headers, and never parse a problem body.
 * Generated types are derived from the composed SDK client so this package does
 * not hand-copy the wire contract.
 */

type TeamMembershipsApi = ReturnType<typeof getSdkworkMembershipAppSdkClient>['memberships'];

/** Organization (team) subscription overview (`GET /memberships/team/subscription`). */
export type TeamSubscriptionOverview = Awaited<
  ReturnType<TeamMembershipsApi['teamSubscription']['retrieve']>
>;

/** One organization seat directory row (`GET /memberships/team/seats`). */
export type TeamSeatMember = Awaited<
  ReturnType<TeamMembershipsApi['teamSeats']['list']>
>['items'][number];

/** Seat directory page info, preserving the server cursor/offset contract. */
export type TeamSeatPageInfo = Awaited<
  ReturnType<TeamMembershipsApi['teamSeats']['list']>
>['pageInfo'];

/** Result of assigning a seat (`POST /memberships/team/seats`). */
export type TeamSeatAssignment = Awaited<
  ReturnType<TeamMembershipsApi['teamSeats']['create']>
>;

/** Organization (team) package catalog item (`GET /memberships/packages`). */
export type TeamPlanPackage = Awaited<
  ReturnType<TeamMembershipsApi['packages']['list']>
>['items'][number];

/** Over-seat policy accepted by the seat policy endpoint. */
export type TeamSeatPolicy = TeamSubscriptionOverview['seatPolicy'];

/**
 * Reasons the backend attaches as `ProblemDetail.reason` for team seat
 * failures. Every entry is a string the app API actually sends
 * (`sdkwork-membership` `crates/sdkwork-routes-membership-app-api/src/router.ts`);
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

/** Membership lifecycle action a team checkout can start. */
export type TeamCheckoutAction = 'purchase' | 'renew';

export interface StartTeamCheckoutInput {
  action: TeamCheckoutAction;
  /** Catalog package id as served by the team package list (int64 string). */
  packageId: string;
  seats: number;
}

export interface TeamSeatPolicyInput {
  autoAssignSeat: boolean;
  seatPolicy: TeamSeatPolicy;
}

const TEAM_PACKAGE_PAGE_SIZE = 200;
const TEAM_PACKAGE_MAX_PAGES = 5;
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

/** Current organization team subscription overview. */
export async function getTeamOverview(): Promise<TeamSubscriptionOverview> {
  try {
    return await teamMemberships().teamSubscription.retrieve();
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

/** One page of the organization seat directory. */
export async function listTeamSeats(params: {
  page: number;
  pageSize: number;
  q?: string;
}): Promise<{ items: TeamSeatMember[]; pageInfo: TeamSeatPageInfo }> {
  try {
    const query = params.q?.trim();
    const result = await teamMemberships().teamSeats.list({
      page: params.page,
      pageSize: params.pageSize,
      ...(query ? { q: query } : {}),
    });
    return { items: result.items, pageInfo: result.pageInfo };
  } catch (error) {
    throw normalizeTeamPlanError(error);
  }
}

/** Assigns the lowest free seat to an active organization member. */
export async function assignTeamSeat(userId: string): Promise<TeamSeatAssignment> {
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

/** Starts the order-owned membership checkout for `seats` organization seats. */
export async function startTeamCheckout(
  input: StartTeamCheckoutInput,
): Promise<TeamCheckoutPayment> {
  try {
    return await getCloudRouterMembershipCheckoutService().createCheckout({
      action: input.action,
      packageId: toTeamPackageNumericId(input.packageId),
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
