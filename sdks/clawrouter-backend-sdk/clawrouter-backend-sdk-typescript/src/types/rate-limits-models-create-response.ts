import type { RateLimitsModelsCreateResult } from './rate-limits-models-create-result';

export interface RateLimitsModelsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
