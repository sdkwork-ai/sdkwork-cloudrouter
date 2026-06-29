import type { ShopsRejectResult } from './shops-reject-result';

export interface ShopsRejectResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
