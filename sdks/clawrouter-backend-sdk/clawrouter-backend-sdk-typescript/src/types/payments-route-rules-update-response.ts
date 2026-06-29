import type { PaymentsRouteRulesUpdateResult } from './payments-route-rules-update-result';

export interface PaymentsRouteRulesUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
