import type { CartItemsUpdateResult } from './cart-items-update-result';

export interface CartItemsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
