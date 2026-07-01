import type { WalletAccountsPointsRetrieveResult } from './wallet-accounts-points-retrieve-result';

export interface WalletAccountsPointsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
