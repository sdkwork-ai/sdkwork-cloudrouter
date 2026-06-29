import type { WalletTransactionsRetrieveResult } from './wallet-transactions-retrieve-result';

export interface WalletTransactionsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
