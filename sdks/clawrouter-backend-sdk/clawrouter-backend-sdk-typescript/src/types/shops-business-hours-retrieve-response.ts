import type { ShopsBusinessHoursRetrieveResult } from './shops-business-hours-retrieve-result';

export interface ShopsBusinessHoursRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
