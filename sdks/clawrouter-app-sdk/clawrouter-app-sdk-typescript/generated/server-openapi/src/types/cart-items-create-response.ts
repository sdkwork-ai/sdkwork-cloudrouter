import type { CartItemsCreateResult } from './cart-items-create-result';

export interface CartItemsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
