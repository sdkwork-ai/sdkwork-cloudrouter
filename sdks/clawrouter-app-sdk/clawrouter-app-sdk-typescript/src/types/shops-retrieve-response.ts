import type { ShopsRetrieveResult } from './shops-retrieve-result';

export interface ShopsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
