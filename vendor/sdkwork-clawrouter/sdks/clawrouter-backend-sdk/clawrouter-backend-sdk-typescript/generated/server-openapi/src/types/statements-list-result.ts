import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Statements list result schema exposed by Claw Router. */
export interface StatementsListResult {
  /** Business response code. */
  code: string;
  /** Data field on statements list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}
