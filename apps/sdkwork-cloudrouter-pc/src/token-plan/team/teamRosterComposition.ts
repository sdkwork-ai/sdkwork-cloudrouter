import type { IamOrganizationMember } from '@sdkwork/iam-app-sdk';

import type { TeamSeatAssignment, TeamSubscriptionOverview } from './teamSubscriptionService.ts';

/**
 * Pure composition of the IAM roster and the membership seat assignments.
 *
 * Membership returns membership-owned facts only (the subscription overview and
 * the seat assignment rows). The organization roster, the caller's role, and the
 * member count are IAM-owned and reach the page through the IAM app SDK. This
 * module joins both fact sets; it performs no IO so the derivation stays
 * testable and the same formulas back every caller.
 */

/** IAM organization role vocabulary shared by the roster and own memberships. */
export type TeamMembershipKind = 'owner' | 'admin' | 'member';

/** One organization roster row as the IAM app SDK publishes it. */
export type TeamRosterMember = IamOrganizationMember;

/** Normalized IAM roster page, with numeric totals for the UI. */
export interface TeamRosterPage {
  hasMore: boolean;
  items: TeamRosterMember[];
  page: number;
  pageSize: number;
  total: number;
}

/** Caller's own IAM organization membership (one per organization). */
export interface TeamOwnMembership {
  isPrimary: boolean;
  organizationId: string;
  role?: TeamMembershipKind;
  status?: string;
}

/** Derived team facts the page renders next to the membership overview. */
export interface TeamSeatComposition {
  canManageSeats: boolean;
  licensedMembers: number;
  membersTotal: number;
  organizationId: string;
  organizationName?: string;
  overSeat: boolean;
  overSeatCount: number;
  unlicensedMembers: number;
  viewerRole?: TeamMembershipKind;
}

/** One roster row joined with the caller's active seat assignment. */
export interface TeamSeatDirectoryRow {
  assignedAt?: string;
  email?: string;
  isAssigned: boolean;
  membershipId: string;
  membershipKind: TeamMembershipKind;
  name: string;
  seatNo?: number;
  userId: string;
  username?: string;
}

const MEMBERSHIP_KINDS: readonly TeamMembershipKind[] = ['owner', 'admin', 'member'];

/** Reads a non-empty trimmed string field from an untyped generated payload. */
function readText(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readFlag(record: Record<string, unknown>, ...keys: string[]): boolean {
  return keys.some((key) => record[key] === true);
}

/** Normalizes an IAM role spelling (`OWNER`, `owner`, `admin`, …). */
export function normalizeMembershipKind(value: string | undefined): TeamMembershipKind | undefined {
  const normalized = value?.trim().toLowerCase();
  return MEMBERSHIP_KINDS.find((kind) => kind === normalized);
}

/** True only for the roles IAM allows to manage organization seats. */
export function canManageTeamSeats(role: TeamMembershipKind | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Parses the caller's own memberships (`iam.organizationMemberships.list`).
 *
 * IAM publishes the role as `membershipKind` on the roster and as
 * `membershipType` on the caller's own membership response, so both spellings
 * are accepted; nothing else about the generated page envelope is trusted.
 */
export function parseOwnMemberships(items: readonly Record<string, unknown>[]): TeamOwnMembership[] {
  return items.flatMap((item) => {
    const organizationId = readText(item, 'organizationId', 'organization_id');
    if (!organizationId) {
      return [];
    }
    const role = normalizeMembershipKind(
      readText(item, 'membershipKind', 'membership_kind', 'membershipType', 'membership_type'),
    );
    return [{
      isPrimary: readFlag(item, 'isPrimary', 'primary'),
      organizationId,
      ...(role ? { role } : {}),
      ...(readText(item, 'status') ? { status: readText(item, 'status') } : {}),
    }];
  });
}

/**
 * Picks the caller's current organization from its own IAM memberships.
 *
 * The IAM app SDK own-membership response is authoritative; a primary
 * membership wins over a secondary one, and the server-reported organization id
 * is only a fallback when IAM publishes no membership for the caller. No custom
 * header participates in this resolution.
 */
export function resolveTeamOrganizationId(
  memberships: readonly TeamOwnMembership[],
  fallbackOrganizationId: string,
): string {
  const active = memberships.filter(
    (membership) => !membership.status || membership.status.toLowerCase() === 'active',
  );
  const current = active.find((membership) => membership.isPrimary) ?? active[0];
  const organizationId = current?.organizationId.trim();
  return organizationId && organizationId.length > 0 ? organizationId : fallbackOrganizationId;
}

/** Caller's role in the resolved organization, read from its own membership. */
export function resolveTeamViewerRole(
  memberships: readonly TeamOwnMembership[],
  organizationId: string,
): TeamMembershipKind | undefined {
  const current = memberships.find((membership) => membership.organizationId === organizationId);
  return current?.role;
}

/**
 * Derives the team facts the membership overview no longer carries.
 *
 * - `viewerRole` comes from the caller's own IAM membership;
 * - `canManageSeats` is `owner`/`admin` only;
 * - `membersTotal` is the IAM roster total;
 * - `licensedMembers` counts seat assignments whose user is on the roster;
 * - `unlicensedMembers = max(0, membersTotal - licensedMembers)`;
 * - `overSeat = unlicensedMembers > 0`;
 * - `overSeatCount = max(0, seatsUsed - seatsPurchased)`.
 */
export function composeTeamSeatComposition(input: {
  membersTotal: number;
  organizationId: string;
  organizationName?: string;
  overview: TeamSubscriptionOverview;
  roster: readonly TeamRosterMember[];
  seatAssignments: readonly TeamSeatAssignment[];
  viewerRole?: TeamMembershipKind;
}): TeamSeatComposition {
  const rosterUserIds = new Set(input.roster.map((member) => member.userId));
  const licensedMembers = input.seatAssignments.filter(
    (assignment) => rosterUserIds.has(assignment.userId),
  ).length;
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

/** Re-derives the seat-overflow facts after a seat policy / overview update. */
export function applyOverviewToComposition(
  composition: TeamSeatComposition,
  overview: TeamSubscriptionOverview,
): TeamSeatComposition {
  const overSeatCount = Math.max(0, overview.seatsUsed - overview.seatsPurchased);
  return {
    ...composition,
    overSeat: composition.unlicensedMembers > 0,
    overSeatCount,
  };
}

/** Human label for a roster row: display name, username, email, then user id. */
export function teamRosterDisplayName(member: {
  displayName?: string;
  email?: string;
  userId: string;
  username?: string;
}): string {
  const displayName = member.displayName?.trim();
  if (displayName) {
    return displayName;
  }
  const username = member.username?.trim();
  if (username) {
    return username;
  }
  const email = member.email?.trim();
  return email ?? member.userId;
}

/**
 * Joins the IAM roster page with the membership seat map by user id so an
 * unassigned member still renders (with an Assign action) and an assigned
 * member renders its seat number.
 */
export function joinTeamSeatDirectory(
  roster: readonly TeamRosterMember[],
  seatAssignments: readonly TeamSeatAssignment[],
): TeamSeatDirectoryRow[] {
  const seatByUserId = new Map(
    seatAssignments.map((assignment) => [assignment.userId, assignment] as const),
  );
  return roster.map((member) => {
    const assignment = seatByUserId.get(member.userId);
    return {
      ...(assignment?.assignedAt ? { assignedAt: assignment.assignedAt } : {}),
      ...(member.email ? { email: member.email } : {}),
      isAssigned: assignment !== undefined,
      membershipId: member.membershipId,
      membershipKind: normalizeMembershipKind(member.membershipKind) ?? 'member',
      name: teamRosterDisplayName(member),
      ...(assignment ? { seatNo: assignment.seatNo } : {}),
      userId: member.userId,
      ...(member.username ? { username: member.username } : {}),
    };
  });
}
