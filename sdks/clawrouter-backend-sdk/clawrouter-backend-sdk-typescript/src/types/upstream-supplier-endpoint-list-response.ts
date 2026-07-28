import type { PageInfo } from './page-info';
import type { UpstreamSupplierEndpoint } from './upstream-supplier-endpoint';

/** Upstream supplier endpoint list response schema exposed by Claw Router. */
export interface UpstreamSupplierEndpointListResponse {
  /** Items field on upstream supplier endpoint list response. */
  items: UpstreamSupplierEndpoint[];
  /** Page info field on upstream supplier endpoint list response. */
  pageInfo: PageInfo;
}
