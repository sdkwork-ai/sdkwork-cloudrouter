import type { WalletExchangeRulesUpdateResult } from './wallet-exchange-rules-update-result';

export interface WalletExchangeRulesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
