import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Members list result schema exposed by Claw Router. */
export interface MembersListResult {
  /** Business response code. */
  code: string;
  /** Data field on members list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}
