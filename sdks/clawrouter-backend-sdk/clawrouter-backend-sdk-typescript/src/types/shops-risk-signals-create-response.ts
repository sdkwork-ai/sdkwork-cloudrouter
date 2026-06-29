import type { ShopsRiskSignalsCreateResult } from './shops-risk-signals-create-result';

export interface ShopsRiskSignalsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
