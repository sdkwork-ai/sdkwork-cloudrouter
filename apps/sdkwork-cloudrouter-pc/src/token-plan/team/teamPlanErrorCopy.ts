import type { TeamPlanErrorReason } from './teamSubscriptionService.ts';

/**
 * Maps a typed team plan failure reason onto existing console copy.
 *
 * Every reason the app API sends has a dedicated message in
 * `token_plan.team.*`; unknown failures fall back to the generic load error so
 * the surface never renders a raw wire code.
 */
export interface TeamPlanErrorCopy {
  fallback: string;
  key: string;
}

export function resolveTeamPlanErrorCopy(
  reason: TeamPlanErrorReason,
): TeamPlanErrorCopy {
  switch (reason) {
    case 'seat_already_assigned':
      return {
        fallback: 'This member already holds a seat.',
        key: 'token_plan.team.error_already_assigned',
      };
    case 'not_organization_member':
      return {
        fallback: 'This user is not an active member of the organization.',
        key: 'token_plan.team.error_not_member',
      };
    case 'seat_management_forbidden':
      return {
        fallback: 'Only organization owners and admins can manage seats.',
        key: 'token_plan.team.error_forbidden',
      };
    case 'team_subscription_inactive':
      return {
        fallback: 'The team subscription is not active.',
        key: 'token_plan.team.error_subscription_inactive',
      };
    case 'last_seat_owner_required':
      return {
        fallback: 'The owner keeps the last active seat.',
        key: 'token_plan.team.last_owner_required',
      };
    case 'seat_assignment_not_found':
      return {
        fallback: 'This member does not hold a seat.',
        key: 'token_plan.team.error_assignment_not_found',
      };
    case 'seat_capacity_exceeded':
      return {
        fallback: 'All purchased seats are assigned. Buy more seats first.',
        key: 'token_plan.team.seat_capacity_exceeded',
      };
    case 'unauthenticated':
      return {
        fallback: 'Unable to load team subscription.',
        key: 'token_plan.team.load_failed',
      };
    case 'organization_scope_required':
      return {
        fallback: 'No organization selected.',
        key: 'token_plan.team.no_org',
      };
    default:
      return {
        fallback: 'Unable to load organization members.',
        key: 'token_plan.team.members_load_failed',
      };
  }
}
