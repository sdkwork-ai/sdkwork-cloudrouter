import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Adjustments list result schema exposed by Claw Router. */
export interface AdjustmentsListResult {
  /** Business response code. */
  code: string;
  /** Data field on adjustments list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}
