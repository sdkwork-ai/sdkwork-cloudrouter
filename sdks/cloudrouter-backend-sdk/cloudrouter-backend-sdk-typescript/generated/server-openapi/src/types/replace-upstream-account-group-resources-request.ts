import type { UpstreamResourceEntitlementInput } from './upstream-resource-entitlement-input';

/** Replace upstream account group resources request schema exposed by Cloud Router. */
export interface ReplaceUpstreamAccountGroupResourcesRequest {
  /** Items field on replace upstream account group resources request. */
  items: UpstreamResourceEntitlementInput[];
}
