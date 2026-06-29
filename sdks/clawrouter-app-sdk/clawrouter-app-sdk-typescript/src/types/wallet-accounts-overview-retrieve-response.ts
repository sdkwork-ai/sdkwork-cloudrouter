import type { WalletAccountsOverviewRetrieveResult } from './wallet-accounts-overview-retrieve-result';

export interface WalletAccountsOverviewRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
