import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Provider registry list result schema exposed by Claw Router. */
export interface ProviderRegistryListResult {
  /** Business response code. */
  code: string;
  /** Data field on provider registry list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}
