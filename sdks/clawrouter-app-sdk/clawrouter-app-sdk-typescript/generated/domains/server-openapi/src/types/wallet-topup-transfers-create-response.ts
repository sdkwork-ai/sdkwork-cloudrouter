import type { WalletTopupTransfersCreateResult } from './wallet-topup-transfers-create-result';

export interface WalletTopupTransfersCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
