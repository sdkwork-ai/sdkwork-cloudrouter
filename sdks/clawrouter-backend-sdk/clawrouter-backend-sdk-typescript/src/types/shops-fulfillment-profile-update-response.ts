import type { ShopsFulfillmentProfileUpdateResult } from './shops-fulfillment-profile-update-result';

export interface ShopsFulfillmentProfileUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
