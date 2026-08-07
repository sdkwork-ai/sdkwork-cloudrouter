import type { UpstreamResourceEntitlement } from './upstream-resource-entitlement';

/** Upstream account resource collection schema exposed by Cloud Router. */
export interface UpstreamAccountResourceCollection {
  /** Id field on upstream account resource collection. */
  id: string;
  /** Items field on upstream account resource collection. */
  items: UpstreamResourceEntitlement[];
}
