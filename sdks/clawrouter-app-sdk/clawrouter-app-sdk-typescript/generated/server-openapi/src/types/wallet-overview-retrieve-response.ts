import type { WalletOverviewRetrieveResult } from './wallet-overview-retrieve-result';

export interface WalletOverviewRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
