import type { WalletLedgerEntriesRetrieveResult } from './wallet-ledger-entries-retrieve-result';

export interface WalletLedgerEntriesRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
