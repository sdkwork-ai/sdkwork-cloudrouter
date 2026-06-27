import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Relations list result schema exposed by Claw Router. */
export interface RelationsListResult {
  /** Business response code. */
  code: string;
  /** Data field on relations list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}
