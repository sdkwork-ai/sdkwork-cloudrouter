import type { AddressesDefaultSelectionCreateResult } from './addresses-default-selection-create-result';

export interface AddressesDefaultSelectionCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
