import type { UpstreamSupplierEndpoint } from './upstream-supplier-endpoint';

/** Upstream supplier endpoint collection schema exposed by Cloud Router. */
export interface UpstreamSupplierEndpointCollection {
  /** Id field on upstream supplier endpoint collection. */
  id: string;
  /** Items field on upstream supplier endpoint collection. */
  items: UpstreamSupplierEndpoint[];
}
