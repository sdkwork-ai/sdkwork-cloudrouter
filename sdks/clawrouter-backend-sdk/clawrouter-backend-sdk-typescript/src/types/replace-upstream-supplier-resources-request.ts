import type { UpstreamResourceEntitlementInput } from './upstream-resource-entitlement-input';

/** Replace upstream supplier resources request schema exposed by Claw Router. */
export interface ReplaceUpstreamSupplierResourcesRequest {
  /** Items field on replace upstream supplier resources request. */
  items: UpstreamResourceEntitlementInput[];
}
