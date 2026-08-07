import type { UpstreamResourceEntitlementInput } from './upstream-resource-entitlement-input';

/** Replace upstream account resources request schema exposed by Cloud Router. */
export interface ReplaceUpstreamAccountResourcesRequest {
  /** Items field on replace upstream account resources request. */
  items: UpstreamResourceEntitlementInput[];
}
