import type { WalletAccountsRetrieveResult } from './wallet-accounts-retrieve-result';

export interface WalletAccountsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
