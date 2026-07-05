import type { RechargesOrdersCreateResult } from './recharges-orders-create-result';

export interface RechargesOrdersCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
