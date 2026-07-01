import type { WalletPointTransfersCreateResult } from './wallet-point-transfers-create-result';

export interface WalletPointTransfersCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
