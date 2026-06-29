import type { ShopsCurrentFulfillmentProfileRetrieveResult } from './shops-current-fulfillment-profile-retrieve-result';

export interface ShopsCurrentFulfillmentProfileRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
