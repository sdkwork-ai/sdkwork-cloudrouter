import type { PageInfo } from './page-info';
import type { UpstreamSupplierAuthMethod } from './upstream-supplier-auth-method';

/** Upstream supplier auth method list response schema exposed by Claw Router. */
export interface UpstreamSupplierAuthMethodListResponse {
  /** Items field on upstream supplier auth method list response. */
  items: UpstreamSupplierAuthMethod[];
  /** Page info field on upstream supplier auth method list response. */
  pageInfo: PageInfo;
}
