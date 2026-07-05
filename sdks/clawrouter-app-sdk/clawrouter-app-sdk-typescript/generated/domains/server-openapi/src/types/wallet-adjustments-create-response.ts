import type { WalletAdjustmentsCreateResult } from './wallet-adjustments-create-result';

export interface WalletAdjustmentsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
