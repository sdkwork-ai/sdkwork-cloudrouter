import type { PageInfo } from './page-info';
import type { UpstreamAccountGroupMember } from './upstream-account-group-member';

/** Upstream account group member list response schema exposed by Claw Router. */
export interface UpstreamAccountGroupMemberListResponse {
  /** Items field on upstream account group member list response. */
  items: UpstreamAccountGroupMember[];
  /** Page info field on upstream account group member list response. */
  pageInfo: PageInfo;
}
