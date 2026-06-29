import type { ShopsCurrentDepositAccountRetrieveResult } from './shops-current-deposit-account-retrieve-result';

export interface ShopsCurrentDepositAccountRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
