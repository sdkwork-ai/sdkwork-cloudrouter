import type { UpstreamAccountGroupMember } from './upstream-account-group-member';

/** Upstream account group member collection schema exposed by Claw Router. */
export interface UpstreamAccountGroupMemberCollection {
  /** Id field on upstream account group member collection. */
  id: string;
  /** Items field on upstream account group member collection. */
  items: UpstreamAccountGroupMember[];
}
