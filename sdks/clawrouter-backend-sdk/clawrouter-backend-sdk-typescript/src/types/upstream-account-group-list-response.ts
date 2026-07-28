import type { PageInfo } from './page-info';
import type { UpstreamAccountGroup } from './upstream-account-group';

/** Upstream account group list response schema exposed by Claw Router. */
export interface UpstreamAccountGroupListResponse {
  /** Items field on upstream account group list response. */
  items: UpstreamAccountGroup[];
  /** Page info field on upstream account group list response. */
  pageInfo: PageInfo;
}
