import type { ServersCreateResult } from './servers-create-result';

export interface ServersCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
