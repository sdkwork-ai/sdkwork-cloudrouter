import type { UpstreamSupplierEndpointInput } from './upstream-supplier-endpoint-input';

/** Replace upstream supplier endpoints request schema exposed by Cloud Router. */
export interface ReplaceUpstreamSupplierEndpointsRequest {
  /** Items field on replace upstream supplier endpoints request. */
  items: UpstreamSupplierEndpointInput[];
}
