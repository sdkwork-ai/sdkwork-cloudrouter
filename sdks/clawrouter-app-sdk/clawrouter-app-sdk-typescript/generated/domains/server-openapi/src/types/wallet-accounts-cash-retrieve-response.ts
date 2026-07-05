import type { WalletAccountsCashRetrieveResult } from './wallet-accounts-cash-retrieve-result';

export interface WalletAccountsCashRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
