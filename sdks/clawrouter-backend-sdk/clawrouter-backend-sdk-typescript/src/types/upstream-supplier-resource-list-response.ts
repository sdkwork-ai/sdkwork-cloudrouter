import type { PageInfo } from './page-info';
import type { UpstreamResourceEntitlement } from './upstream-resource-entitlement';

/** Upstream supplier resource list response schema exposed by Claw Router. */
export interface UpstreamSupplierResourceListResponse {
  /** Items field on upstream supplier resource list response. */
  items: UpstreamResourceEntitlement[];
  /** Page info field on upstream supplier resource list response. */
  pageInfo: PageInfo;
}
