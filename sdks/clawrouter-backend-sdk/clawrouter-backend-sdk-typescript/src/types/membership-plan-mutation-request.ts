import type { JsonValue } from './json-value';

/** Membership plan mutation request schema exposed by Claw Router. */
export interface MembershipPlanMutationRequest {
  /** Benefits field on membership plan mutation request. */
  benefits?: Record<string, JsonValue>[];
  /** Code field on membership plan mutation request. */
  code: string;
  /** Name field on membership plan mutation request. */
  name: string;
  /** Rank field on membership plan mutation request. */
  rank?: string;
  /** Status field on membership plan mutation request. */
  status: 'active' | 'inactive' | 'disabled';
}
