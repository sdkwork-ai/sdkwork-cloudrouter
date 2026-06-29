import type { ShopsFulfillmentProfileRetrieveResult } from './shops-fulfillment-profile-retrieve-result';

export interface ShopsFulfillmentProfileRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
