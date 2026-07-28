import type { UpstreamSupplierEndpoint } from './upstream-supplier-endpoint';

/** Upstream supplier endpoint collection schema exposed by Claw Router. */
export interface UpstreamSupplierEndpointCollection {
  /** Items field on upstream supplier endpoint collection. */
  items: UpstreamSupplierEndpoint[];
}
