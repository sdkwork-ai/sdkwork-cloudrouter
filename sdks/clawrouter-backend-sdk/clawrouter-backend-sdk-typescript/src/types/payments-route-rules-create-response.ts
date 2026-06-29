import type { PaymentsRouteRulesCreateResult } from './payments-route-rules-create-result';

export interface PaymentsRouteRulesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
