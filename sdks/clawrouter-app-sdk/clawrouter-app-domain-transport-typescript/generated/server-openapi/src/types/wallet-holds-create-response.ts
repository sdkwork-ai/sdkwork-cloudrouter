import type { WalletHoldsCreateResult } from './wallet-holds-create-result';

export interface WalletHoldsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
