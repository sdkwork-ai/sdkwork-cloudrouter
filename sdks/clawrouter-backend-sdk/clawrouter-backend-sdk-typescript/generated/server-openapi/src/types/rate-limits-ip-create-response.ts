import type { RateLimitsIpCreateResult } from './rate-limits-ip-create-result';

export interface RateLimitsIpCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
