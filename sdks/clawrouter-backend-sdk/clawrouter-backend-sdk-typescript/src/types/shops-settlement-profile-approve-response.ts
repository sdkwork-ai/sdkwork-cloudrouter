import type { ShopsSettlementProfileApproveResult } from './shops-settlement-profile-approve-result';

export interface ShopsSettlementProfileApproveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
