import type { WalletAdjustmentsManagementCreateResult } from './wallet-adjustments-management-create-result';

export interface WalletAdjustmentsManagementCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
