import type { CartCurrentRetrieveResult } from './cart-current-retrieve-result';

export interface CartCurrentRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
