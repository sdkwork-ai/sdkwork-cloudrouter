import type { ShopsCurrentRetrieveResult } from './shops-current-retrieve-result';

export interface ShopsCurrentRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
