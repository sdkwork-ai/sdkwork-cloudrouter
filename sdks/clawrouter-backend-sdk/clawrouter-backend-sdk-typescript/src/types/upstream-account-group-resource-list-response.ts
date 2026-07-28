import type { PageInfo } from './page-info';
import type { UpstreamResourceEntitlement } from './upstream-resource-entitlement';

/** Upstream account group resource list response schema exposed by Claw Router. */
export interface UpstreamAccountGroupResourceListResponse {
  /** Items field on upstream account group resource list response. */
  items: UpstreamResourceEntitlement[];
  /** Page info field on upstream account group resource list response. */
  pageInfo: PageInfo;
}
