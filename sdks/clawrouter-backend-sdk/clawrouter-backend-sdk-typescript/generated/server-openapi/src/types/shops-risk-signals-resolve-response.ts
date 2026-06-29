import type { ShopsRiskSignalsResolveResult } from './shops-risk-signals-resolve-result';

export interface ShopsRiskSignalsResolveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
