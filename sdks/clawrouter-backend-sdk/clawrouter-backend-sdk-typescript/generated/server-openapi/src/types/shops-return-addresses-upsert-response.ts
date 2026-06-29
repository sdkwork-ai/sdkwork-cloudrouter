import type { ShopsReturnAddressesUpsertResult } from './shops-return-addresses-upsert-result';

export interface ShopsReturnAddressesUpsertResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
