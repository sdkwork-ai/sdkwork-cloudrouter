import type { ShopsCurrentOrdersRetrieveResult } from './shops-current-orders-retrieve-result';

export interface ShopsCurrentOrdersRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
