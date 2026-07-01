import type { WalletPointExchangesCreateResult } from './wallet-point-exchanges-create-result';

export interface WalletPointExchangesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
