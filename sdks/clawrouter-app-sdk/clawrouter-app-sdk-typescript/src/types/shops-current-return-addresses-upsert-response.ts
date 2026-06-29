import type { ShopsCurrentReturnAddressesUpsertResult } from './shops-current-return-addresses-upsert-result';

export interface ShopsCurrentReturnAddressesUpsertResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
