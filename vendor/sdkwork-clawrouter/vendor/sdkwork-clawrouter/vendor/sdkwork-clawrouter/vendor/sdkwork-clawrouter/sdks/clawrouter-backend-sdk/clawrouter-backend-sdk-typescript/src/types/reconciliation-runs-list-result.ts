import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Reconciliation runs list result schema exposed by Claw Router. */
export interface ReconciliationRunsListResult {
  /** Business response code. */
  code: string;
  /** Data field on reconciliation runs list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}
