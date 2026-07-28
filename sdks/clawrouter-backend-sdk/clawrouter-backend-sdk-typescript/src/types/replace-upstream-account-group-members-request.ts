import type { UpstreamAccountGroupMemberInput } from './upstream-account-group-member-input';

/** Replace upstream account group members request schema exposed by Claw Router. */
export interface ReplaceUpstreamAccountGroupMembersRequest {
  /** Items field on replace upstream account group members request. */
  items: UpstreamAccountGroupMemberInput[];
}
