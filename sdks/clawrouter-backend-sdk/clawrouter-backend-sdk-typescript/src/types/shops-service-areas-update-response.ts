import type { ShopsServiceAreasUpdateResult } from './shops-service-areas-update-result';

export interface ShopsServiceAreasUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
