import type { WalletWithdrawalTransfersCreateResult } from './wallet-withdrawal-transfers-create-result';

export interface WalletWithdrawalTransfersCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
