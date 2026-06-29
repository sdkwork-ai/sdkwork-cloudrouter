import type { ShopsBusinessHoursUpdateResult } from './shops-business-hours-update-result';

export interface ShopsBusinessHoursUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
