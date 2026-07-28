import type { UpstreamResourceEntitlement } from './upstream-resource-entitlement';

/** Upstream supplier resource collection schema exposed by Claw Router. */
export interface UpstreamSupplierResourceCollection {
  /** Items field on upstream supplier resource collection. */
  items: UpstreamResourceEntitlement[];
}
