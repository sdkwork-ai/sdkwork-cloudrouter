import type { HealthCheckCreateResult } from './health-check-create-result';

export interface HealthCheckCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
