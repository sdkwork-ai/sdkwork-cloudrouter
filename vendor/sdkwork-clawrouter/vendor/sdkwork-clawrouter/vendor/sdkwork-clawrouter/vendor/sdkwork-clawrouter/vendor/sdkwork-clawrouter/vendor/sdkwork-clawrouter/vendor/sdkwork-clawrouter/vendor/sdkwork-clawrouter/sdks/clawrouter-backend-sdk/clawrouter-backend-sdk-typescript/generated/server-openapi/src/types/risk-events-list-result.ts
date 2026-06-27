import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Risk events list result schema exposed by Claw Router. */
export interface RiskEventsListResult {
  /** Business response code. */
  code: string;
  /** Data field on risk events list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}
