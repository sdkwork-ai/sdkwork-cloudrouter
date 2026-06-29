import type { WalletPointExchangesRetrieveResult } from './wallet-point-exchanges-retrieve-result';

export interface WalletPointExchangesRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
