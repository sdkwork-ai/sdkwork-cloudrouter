import type { ShopsCurrentSettlementProfileUpdateResult } from './shops-current-settlement-profile-update-result';

export interface ShopsCurrentSettlementProfileUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
