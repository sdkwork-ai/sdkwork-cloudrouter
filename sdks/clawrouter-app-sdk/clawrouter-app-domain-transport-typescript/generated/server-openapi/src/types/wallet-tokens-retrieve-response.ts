import type { WalletTokensRetrieveResult } from './wallet-tokens-retrieve-result';

export interface WalletTokensRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
