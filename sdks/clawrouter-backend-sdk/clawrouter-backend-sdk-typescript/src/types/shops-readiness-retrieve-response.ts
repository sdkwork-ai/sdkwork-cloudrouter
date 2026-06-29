import type { ShopsReadinessRetrieveResult } from './shops-readiness-retrieve-result';

export interface ShopsReadinessRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
