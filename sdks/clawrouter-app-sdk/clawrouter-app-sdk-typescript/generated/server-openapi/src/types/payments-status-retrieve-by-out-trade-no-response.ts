import type { PaymentsStatusRetrieveByOutTradeNoResult } from './payments-status-retrieve-by-out-trade-no-result';

export interface PaymentsStatusRetrieveByOutTradeNoResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
