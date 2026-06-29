import type { ShopsCurrentSettlementProfileRetrieveResult } from './shops-current-settlement-profile-retrieve-result';

export interface ShopsCurrentSettlementProfileRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
