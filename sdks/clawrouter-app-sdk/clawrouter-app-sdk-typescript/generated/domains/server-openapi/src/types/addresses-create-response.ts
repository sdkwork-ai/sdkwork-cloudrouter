import type { AddressesCreateResult } from './addresses-create-result';

export interface AddressesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
