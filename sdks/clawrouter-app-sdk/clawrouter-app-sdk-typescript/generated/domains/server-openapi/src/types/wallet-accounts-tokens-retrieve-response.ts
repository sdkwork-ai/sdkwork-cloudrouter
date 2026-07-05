import type { WalletAccountsTokensRetrieveResult } from './wallet-accounts-tokens-retrieve-result';

export interface WalletAccountsTokensRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
