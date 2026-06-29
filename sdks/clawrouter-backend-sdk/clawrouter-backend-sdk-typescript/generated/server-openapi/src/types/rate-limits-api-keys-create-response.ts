import type { RateLimitsApiKeysCreateResult } from './rate-limits-api-keys-create-result';

export interface RateLimitsApiKeysCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
