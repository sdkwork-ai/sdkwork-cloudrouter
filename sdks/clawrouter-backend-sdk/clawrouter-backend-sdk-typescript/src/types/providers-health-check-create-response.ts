import type { ProvidersHealthCheckCreateResult } from './providers-health-check-create-result';

export interface ProvidersHealthCheckCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
