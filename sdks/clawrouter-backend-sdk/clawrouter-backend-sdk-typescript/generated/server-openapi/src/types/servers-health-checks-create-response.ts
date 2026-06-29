import type { ServersHealthChecksCreateResult } from './servers-health-checks-create-result';

export interface ServersHealthChecksCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
