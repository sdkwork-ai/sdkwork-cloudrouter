import type { ShopsCurrentReadinessRetrieveResult } from './shops-current-readiness-retrieve-result';

export interface ShopsCurrentReadinessRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
