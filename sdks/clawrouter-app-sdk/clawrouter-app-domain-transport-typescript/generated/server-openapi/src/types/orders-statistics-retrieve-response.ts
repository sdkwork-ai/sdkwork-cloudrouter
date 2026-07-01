import type { OrdersStatisticsRetrieveResult } from './orders-statistics-retrieve-result';

export interface OrdersStatisticsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
