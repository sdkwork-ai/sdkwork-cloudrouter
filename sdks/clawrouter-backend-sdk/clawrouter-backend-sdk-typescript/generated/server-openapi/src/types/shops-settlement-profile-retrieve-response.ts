import type { ShopsSettlementProfileRetrieveResult } from './shops-settlement-profile-retrieve-result';

export interface ShopsSettlementProfileRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
