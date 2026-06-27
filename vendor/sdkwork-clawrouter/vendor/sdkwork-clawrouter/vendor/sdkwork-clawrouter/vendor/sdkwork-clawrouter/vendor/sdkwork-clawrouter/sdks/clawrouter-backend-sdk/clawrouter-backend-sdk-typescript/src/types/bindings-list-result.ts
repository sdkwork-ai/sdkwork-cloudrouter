import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Bindings list result schema exposed by Claw Router. */
export interface BindingsListResult {
  /** Business response code. */
  code: string;
  /** Data field on bindings list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}
