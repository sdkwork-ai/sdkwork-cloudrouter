import type { ShopsDepositAccountUpdateResult } from './shops-deposit-account-update-result';

export interface ShopsDepositAccountUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
