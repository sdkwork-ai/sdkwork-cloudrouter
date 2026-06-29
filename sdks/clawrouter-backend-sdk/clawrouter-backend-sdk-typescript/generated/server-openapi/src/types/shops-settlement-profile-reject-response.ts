import type { ShopsSettlementProfileRejectResult } from './shops-settlement-profile-reject-result';

export interface ShopsSettlementProfileRejectResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
