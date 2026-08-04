import type { UpstreamResourceEntitlement } from './upstream-resource-entitlement';

/** Upstream supplier resource collection schema exposed by Claw Router. */
export interface UpstreamSupplierResourceCollection {
  /** Id field on upstream supplier resource collection. */
  id: string;
  /** Items field on upstream supplier resource collection. */
  items: UpstreamResourceEntitlement[];
}
