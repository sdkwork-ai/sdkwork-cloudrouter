import type { ShopsCurrentServiceAreasUpdateResult } from './shops-current-service-areas-update-result';

export interface ShopsCurrentServiceAreasUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
