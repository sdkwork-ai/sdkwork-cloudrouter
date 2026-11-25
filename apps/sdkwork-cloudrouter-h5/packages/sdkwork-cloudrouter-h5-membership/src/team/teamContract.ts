/**
 * Cloud Router H5 organization (team) subscription contract.
 *
 * The Cloud Router PC token-plan page composes team subscription facts from two
 * owners: membership owns the team subscription, seat ledger, and seat policy;
 * IAM owns the organization membership, roster, and organization selection. This
 * module is the mobile-owned mirror of that contract — the same wire fields, the
 * same "buy first, bind later" lifecycle, the same machine-readable error
 * vocabulary — so both surfaces describe the same team membership.
 */

/** The platform organization id is the personal scope, never a team scope. */
export const TEAM_PLATFORM_ORGANIZATION_ID = '0';

/** Seat assignments are read in 100-row pages, bounded to 20 pages. */
export const TEAM_SEAT_PAGE_SIZE = 100;
export const TEAM_SEAT_MAX_PAGES = 20;
/** IAM caps an organization roster page at 200 rows; the member walk is bounded. */
export const TEAM_ROSTER_PAGE_SIZE = 200;
export const TEAM_ROSTER_MAX_PAGES = 10;
/** Directory page size on the mobile seat list. */
export const TEAM_DIRECTORY_PAGE_SIZE = 10;

export type TeamSeatPolicy = 'strict' | 'flex_overflow';
export type TeamMembershipKind = 'owner' | 'admin' | 'member';
export type TeamSubscriptionStatus = 'completed' | 'failed' | 'pending';

export interface TeamSubscriptionOverview {
  readonly autoAssignSeat: boolean;
  readonly expiresAt?: string;
  readonly hasSubscription: boolean;
  /** Empty when the answer is the caller's unbound (bought-before-org) subscription. */
  readonly organizationId: string;
  readonly organizationBindingStatus?: 'bound' | 'unbound';
  readonly planId?: string;
  readonly planName?: string;
  readonly planRank?: string;
  readonly seatPolicy: TeamSeatPolicy;
  readonly seatsAvailable: number;
  readonly seatsPurchased: number;
  readonly seatsUsed: number;
  readonly startsAt?: string;
  readonly status?: string;
  readonly subscriptionId?: string;
}

export interface TeamSeatAssignment {
  readonly assignedAt?: string;
  readonly membershipId?: string;
  readonly seatNo: number;
  readonly userId: string;
}

export interface TeamSeatAssignmentResult {
  readonly assignedAt?: string;
  readonly membershipId?: string;
  readonly seatNo: number;
  readonly userId: string;
}

export interface TeamSeatReconciliation {
  readonly revokedCount: number;
  readonly seatsPurchased: number;
  readonly seatsUsed: number;
}

export interface TeamPackage {
  readonly id: string;
  readonly name: string;
  readonly originalPrice?: string;
  readonly packageGroupId?: string;
  readonly planId: string;
  readonly planName?: string;
  readonly planRank: string;
  readonly price: string;
  readonly recurrenceCycle?: string | null;
  readonly recommended: boolean;
  readonly seatMax: string;
  readonly seatMin: string;
  readonly seatPointsAmount: string;
  readonly sortWeight: string;
}

export interface TeamPackageGroup {
  readonly billingCycle?: string | null;
  readonly description?: string;
  readonly durationDays?: string;
  readonly id: string;
  readonly name: string;
  readonly packages: readonly TeamPackage[];
}

export interface TeamRosterMember {
  readonly displayName?: string;
  readonly email?: string;
  readonly membershipId: string;
  readonly membershipKind: TeamMembershipKind;
  readonly userId: string;
  readonly username?: string;
}

export interface TeamRosterPage {
  readonly hasMore: boolean;
  readonly items: readonly TeamRosterMember[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface TeamRosterQuery {
  readonly organizationId: string;
  readonly page: number;
  readonly pageSize: number;
  readonly q?: string;
}

export interface TeamOwnMembership {
  readonly isPrimary: boolean;
  readonly organizationId: string;
  readonly role?: TeamMembershipKind;
  readonly status?: string;
}

export interface TeamOrganizationChoice {
  readonly isCurrent: boolean;
  readonly organizationId: string;
  readonly organizationName?: string;
  readonly role?: TeamMembershipKind;
}

export interface TeamSeatComposition {
  readonly canManageSeats: boolean;
  readonly licensedMembers: number;
  readonly membersTotal: number;
  readonly organizationId: string;
  readonly organizationName?: string;
  readonly overSeat: boolean;
  readonly overSeatCount: number;
  readonly unlicensedMembers: number;
  readonly viewerRole?: TeamMembershipKind;
}

export interface TeamSeatDirectoryRow {
  readonly assignedAt?: string;
  readonly email?: string;
  readonly isAssigned: boolean;
  readonly membershipId: string;
  readonly membershipKind: TeamMembershipKind;
  readonly name: string;
  readonly seatNo?: number;
  readonly userId: string;
  readonly username?: string;
}

export type TeamCheckoutAction = 'purchase' | 'add_seats';

export interface TeamCheckoutRequest {
  readonly action: TeamCheckoutAction;
  readonly packageId: string;
  /** `purchase` sends the total seats; `add_seats` sends the seats to add. */
  readonly seats: number;
}

export interface TeamSeatPolicyInput {
  readonly autoAssignSeat: boolean;
  readonly seatPolicy: TeamSeatPolicy;
}

/** Machine-readable reasons the membership/IAM APIs return for team failures. */
export const TEAM_ERROR_REASONS = [
  'seat_capacity_exceeded',
  'seat_already_assigned',
  'not_organization_member',
  'seat_management_forbidden',
  'team_subscription_inactive',
  'last_seat_owner_required',
  'seat_assignment_not_found',
  'organization_scope_required',
  'team_subscription_unbound',
  'team_subscription_already_unbound',
  'team_subscription_not_found',
  'team_organization_already_subscribed',
] as const;

export type TeamErrorReason =
  | (typeof TEAM_ERROR_REASONS)[number]
  | 'organization_sign_in_required'
  | 'unauthenticated'
  | 'unknown';

/** Normalized team failure; screens map `reason` to localized copy. */
export class TeamSubscriptionError extends Error {
  readonly httpStatus: number | undefined;
  readonly reason: TeamErrorReason;

  constructor(reason: TeamErrorReason, message: string, httpStatus?: number) {
    super(message);
    this.name = 'TeamSubscriptionError';
    this.reason = reason;
    this.httpStatus = httpStatus;
  }
}

interface TeamProblemRecord {
  readonly code?: number | string;
  readonly detail?: string;
  readonly reason?: unknown;
  readonly status?: number;
}

const UNAUTHORIZED_PLATFORM_CODE = 40101;

function readProblemRecord(error: unknown): TeamProblemRecord | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const candidate = (error as { problem?: unknown }).problem;
  return candidate && typeof candidate === 'object' ? (candidate as TeamProblemRecord) : undefined;
}

function readHttpStatus(error: unknown, problem: TeamProblemRecord | undefined): number | undefined {
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

function readErrorMessage(error: unknown, problem: TeamProblemRecord | undefined): string {
  const detail = typeof problem?.detail === 'string' ? problem.detail.trim() : '';
  if (detail.length > 0) {
    return detail;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Team subscription request failed.';
}

/** Normalizes any thrown value into the typed team failure the screens render. */
export function normalizeTeamError(error: unknown): TeamSubscriptionError {
  if (error instanceof TeamSubscriptionError) {
    return error;
  }
  const problem = readProblemRecord(error);
  const httpStatus = readHttpStatus(error, problem);
  const message = readErrorMessage(error, problem);
  if (httpStatus === 401) {
    return new TeamSubscriptionError('unauthenticated', message, httpStatus);
  }
  const rawReason = typeof problem?.reason === 'string' ? problem.reason.trim() : '';
  const known = TEAM_ERROR_REASONS.find((reason) => reason === rawReason);
  return new TeamSubscriptionError(known ?? 'unknown', message, httpStatus);
}

/**
 * Reads the numeric checkout package id from the catalog's int64 string.
 *
 * The order checkout takes a number; a value that does not round-trip exactly
 * can never be sent to the payment service.
 */
export function readTeamPackageNumericId(packageId: string): number {
  const normalized = packageId.trim();
  const numeric = Number(normalized);
  if (
    normalized.length === 0
    || !/^\d+$/u.test(normalized)
    || !Number.isSafeInteger(numeric)
    || numeric <= 0
    || String(numeric) !== normalized
  ) {
    throw new TeamSubscriptionError(
      'unknown',
      `Team subscription package id is not a valid catalog id: ${packageId}`,
    );
  }
  return numeric;
}

function readString(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

/** Parses the caller's own IAM organization memberships (tolerant of casing). */
export function parseOwnMemberships(items: readonly Record<string, unknown>[]): TeamOwnMembership[] {
  const memberships: TeamOwnMembership[] = [];
  for (const item of items) {
    const organizationId = readString(item, ['organizationId', 'organization_id']);
    if (!organizationId) {
      continue;
    }
    const role = normalizeMembershipKind(
      readString(item, ['membershipKind', 'membership_kind', 'membershipType', 'membership_type']),
    );
    const status = readString(item, ['status']);
    const isPrimary = item.isPrimary === true || item.primary === true;
    memberships.push({
      isPrimary,
      organizationId,
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
    });
  }
  return memberships;
}

export function normalizeMembershipKind(value: string | undefined): TeamMembershipKind | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'owner' || normalized === 'admin' || normalized === 'member') {
    return normalized;
  }
  return undefined;
}

export function canManageTeamSeats(role: TeamMembershipKind | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

const TEAM_ROLE_RANK: Record<TeamMembershipKind, number> = {
  admin: 2,
  member: 1,
  owner: 3,
};

/**
 * Reduces own memberships to switchable team organizations.
 *
 * The platform organization is dropped, inactive rows are ignored, and the
 * highest privilege wins when one organization has several membership rows.
 */
export function resolveTeamOrganizationChoices(
  memberships: readonly TeamOwnMembership[],
  currentOrganizationId: string | undefined,
): TeamOrganizationChoice[] {
  const byOrganization = new Map<string, TeamOwnMembership>();
  for (const membership of memberships) {
    const organizationId = membership.organizationId.trim();
    if (organizationId.length === 0 || organizationId === TEAM_PLATFORM_ORGANIZATION_ID) {
      continue;
    }
    if (membership.status && membership.status.toLowerCase() !== 'active') {
      continue;
    }
    const existing = byOrganization.get(organizationId);
    const existingRank = existing?.role ? TEAM_ROLE_RANK[existing.role] : 0;
    const candidateRank = membership.role ? TEAM_ROLE_RANK[membership.role] : 0;
    if (existing === undefined || candidateRank > existingRank) {
      byOrganization.set(organizationId, membership);
    }
  }
  return [...byOrganization.values()].map((membership) => ({
    isCurrent: membership.organizationId.trim() === currentOrganizationId,
    organizationId: membership.organizationId.trim(),
    ...(membership.role ? { role: membership.role } : {}),
  }));
}

/** The active organization id: the overview wins, then the primary own membership. */
export function resolveTeamOrganizationId(
  memberships: readonly TeamOwnMembership[],
  fallbackOrganizationId: string,
): string {
  const overviewId = fallbackOrganizationId.trim();
  if (overviewId.length > 0 && overviewId !== TEAM_PLATFORM_ORGANIZATION_ID) {
    return overviewId;
  }
  const active = memberships.filter(
    (membership) => !membership.status || membership.status.toLowerCase() === 'active',
  );
  const primary = active.find((membership) => membership.isPrimary);
  return (primary ?? active[0])?.organizationId.trim() ?? overviewId;
}

export function resolveTeamViewerRole(
  memberships: readonly TeamOwnMembership[],
  organizationId: string,
): TeamMembershipKind | undefined {
  return memberships.find((membership) => membership.organizationId === organizationId)?.role;
}

export function isTeamSubscriptionUnbound(overview: TeamSubscriptionOverview): boolean {
  return overview.organizationBindingStatus === 'unbound';
}

export function hasTeamOrganizationScope(overview: TeamSubscriptionOverview): boolean {
  const organizationId = overview.organizationId.trim();
  return (
    organizationId.length > 0
    && organizationId !== TEAM_PLATFORM_ORGANIZATION_ID
    && !isTeamSubscriptionUnbound(overview)
  );
}

export interface ComposeTeamSeatCompositionInput {
  readonly membersTotal: number;
  readonly organizationId: string;
  readonly organizationName?: string;
  readonly overview: TeamSubscriptionOverview;
  readonly roster: readonly TeamRosterMember[];
  readonly seatAssignments: readonly TeamSeatAssignment[];
  readonly viewerRole?: TeamMembershipKind;
}

/** Derives the mobile seat summary from membership facts plus the IAM roster. */
export function composeTeamSeatComposition(
  input: ComposeTeamSeatCompositionInput,
): TeamSeatComposition {
  const rosterUserIds = new Set(input.roster.map((member) => member.userId));
  const licensedMembers = input.seatAssignments.filter((assignment) =>
    rosterUserIds.has(assignment.userId)).length;
  const membersTotal = Math.max(0, input.membersTotal);
  const unlicensedMembers = Math.max(0, membersTotal - licensedMembers);
  const overSeatCount = Math.max(0, input.overview.seatsUsed - input.overview.seatsPurchased);
  return {
    canManageSeats: canManageTeamSeats(input.viewerRole),
    licensedMembers,
    membersTotal,
    organizationId: input.organizationId,
    ...(input.organizationName ? { organizationName: input.organizationName } : {}),
    overSeat: unlicensedMembers > 0,
    overSeatCount,
    unlicensedMembers,
    ...(input.viewerRole ? { viewerRole: input.viewerRole } : {}),
  };
}

export function teamRosterDisplayName(member: TeamRosterMember): string {
  return member.displayName?.trim()
    || member.username?.trim()
    || member.email?.trim()
    || member.userId;
}

/** Joins the roster with the seat ledger into one directory row per member. */
export function joinTeamSeatDirectory(
  roster: readonly TeamRosterMember[],
  assignments: readonly TeamSeatAssignment[],
): TeamSeatDirectoryRow[] {
  const byUser = new Map(assignments.map((assignment) => [assignment.userId, assignment]));
  return roster.map((member) => {
    const assignment = byUser.get(member.userId);
    return {
      ...(assignment?.assignedAt ? { assignedAt: assignment.assignedAt } : {}),
      ...(member.email ? { email: member.email } : {}),
      isAssigned: assignment !== undefined,
      membershipId: member.membershipId,
      membershipKind: member.membershipKind,
      name: teamRosterDisplayName(member),
      ...(assignment ? { seatNo: assignment.seatNo } : {}),
      userId: member.userId,
      ...(member.username ? { username: member.username } : {}),
    };
  });
}

/** Replaces `{{name}}` placeholders and keeps unmatched ones intact. */
export function formatTeamCopy(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{\{(\w+)\}\}/gu, (match, key: string) =>
    (values[key] === undefined ? match : String(values[key])));
}
