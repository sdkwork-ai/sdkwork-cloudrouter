import type { ShopsDepositAccountRetrieveResult } from './shops-deposit-account-retrieve-result';

export interface ShopsDepositAccountRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
