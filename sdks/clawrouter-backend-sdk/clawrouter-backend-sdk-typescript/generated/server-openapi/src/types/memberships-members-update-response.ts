import type { MembershipsMembersUpdateResult } from './memberships-members-update-result';

export interface MembershipsMembersUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
