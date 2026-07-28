import type { PageInfo } from './page-info';
import type { UpstreamSupplier } from './upstream-supplier';

/** Upstream supplier list response schema exposed by Claw Router. */
export interface UpstreamSupplierListResponse {
  /** Items field on upstream supplier list response. */
  items: UpstreamSupplier[];
  /** Page info field on upstream supplier list response. */
  pageInfo: PageInfo;
}
