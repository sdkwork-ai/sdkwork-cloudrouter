import type { UpstreamAccount } from './upstream-account';

/** Upstream account item response schema exposed by Claw Router. */
export interface UpstreamAccountItemResponse {
  /** Item field on upstream account item response. */
  item: UpstreamAccount;
}
