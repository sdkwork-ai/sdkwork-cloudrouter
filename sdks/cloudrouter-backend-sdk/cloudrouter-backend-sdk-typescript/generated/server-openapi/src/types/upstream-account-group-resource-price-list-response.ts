import type { PageInfo } from './page-info';
import type { UpstreamAccountGroupResourcePrice } from './upstream-account-group-resource-price';

/** Upstream account group resource price list response schema exposed by Cloud Router. */
export interface UpstreamAccountGroupResourcePriceListResponse {
  /** Items field on upstream account group resource price list response. */
  items: UpstreamAccountGroupResourcePrice[];
  /** Page info field on upstream account group resource price list response. */
  pageInfo: PageInfo;
}
