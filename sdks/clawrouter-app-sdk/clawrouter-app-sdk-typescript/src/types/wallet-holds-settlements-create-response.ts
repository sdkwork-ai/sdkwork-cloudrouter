import type { WalletHoldsSettlementsCreateResult } from './wallet-holds-settlements-create-result';

export interface WalletHoldsSettlementsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
