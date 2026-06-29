import type { WalletRequestsRetrieveResult } from './wallet-requests-retrieve-result';

export interface WalletRequestsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
