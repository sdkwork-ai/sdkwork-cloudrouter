import type { WalletExchangeRateRetrieveResult } from './wallet-exchange-rate-retrieve-result';

export interface WalletExchangeRateRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
