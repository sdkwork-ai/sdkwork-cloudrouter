import type { AddressesUpdateResult } from './addresses-update-result';

export interface AddressesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
