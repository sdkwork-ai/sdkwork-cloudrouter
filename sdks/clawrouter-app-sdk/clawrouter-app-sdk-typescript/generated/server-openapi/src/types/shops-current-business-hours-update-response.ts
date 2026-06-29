import type { ShopsCurrentBusinessHoursUpdateResult } from './shops-current-business-hours-update-result';

export interface ShopsCurrentBusinessHoursUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
