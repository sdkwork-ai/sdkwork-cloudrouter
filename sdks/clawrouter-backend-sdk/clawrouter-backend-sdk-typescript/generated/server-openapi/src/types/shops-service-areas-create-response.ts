import type { ShopsServiceAreasCreateResult } from './shops-service-areas-create-result';

export interface ShopsServiceAreasCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
