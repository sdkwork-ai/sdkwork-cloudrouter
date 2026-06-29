import type { ShopsCurrentBusinessHoursRetrieveResult } from './shops-current-business-hours-retrieve-result';

export interface ShopsCurrentBusinessHoursRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
