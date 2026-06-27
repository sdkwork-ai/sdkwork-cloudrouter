import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Usage list result schema exposed by Claw Router. */
export interface UsageListResult {
  /** Business response code. */
  code: string;
  /** Data field on usage list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}
