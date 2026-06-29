import type { PriceSimulationCreateResult } from './price-simulation-create-result';

export interface PriceSimulationCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
