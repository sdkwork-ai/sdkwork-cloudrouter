import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Contracts list result schema exposed by Claw Router. */
export interface ContractsListResult {
  /** Business response code. */
  code: string;
  /** Data field on contracts list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}
