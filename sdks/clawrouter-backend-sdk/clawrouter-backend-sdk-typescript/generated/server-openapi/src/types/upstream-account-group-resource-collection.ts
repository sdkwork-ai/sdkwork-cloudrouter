import type { UpstreamResourceEntitlement } from './upstream-resource-entitlement';

/** Upstream account group resource collection schema exposed by Claw Router. */
export interface UpstreamAccountGroupResourceCollection {
  /** Id field on upstream account group resource collection. */
  id: string;
  /** Items field on upstream account group resource collection. */
  items: UpstreamResourceEntitlement[];
}
