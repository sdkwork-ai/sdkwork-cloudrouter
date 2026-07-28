import type { UpstreamSupplier } from './upstream-supplier';

/** Upstream supplier item response schema exposed by Claw Router. */
export interface UpstreamSupplierItemResponse {
  /** Item field on upstream supplier item response. */
  item: UpstreamSupplier;
}
