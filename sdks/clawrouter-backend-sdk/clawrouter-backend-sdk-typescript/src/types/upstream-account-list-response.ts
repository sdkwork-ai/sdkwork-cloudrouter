import type { PageInfo } from './page-info';
import type { UpstreamAccount } from './upstream-account';

/** Upstream account list response schema exposed by Claw Router. */
export interface UpstreamAccountListResponse {
  /** Items field on upstream account list response. */
  items: UpstreamAccount[];
  /** Page info field on upstream account list response. */
  pageInfo: PageInfo;
}
