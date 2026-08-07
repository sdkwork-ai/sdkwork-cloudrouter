import type { PageInfo } from './page-info';
import type { UpstreamResourceEntitlement } from './upstream-resource-entitlement';

/** Upstream account resource list response schema exposed by Cloud Router. */
export interface UpstreamAccountResourceListResponse {
  /** Items field on upstream account resource list response. */
  items: UpstreamResourceEntitlement[];
  /** Page info field on upstream account resource list response. */
  pageInfo: PageInfo;
}
