import type { ShopsSettlementProfileUpdateResult } from './shops-settlement-profile-update-result';

export interface ShopsSettlementProfileUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
