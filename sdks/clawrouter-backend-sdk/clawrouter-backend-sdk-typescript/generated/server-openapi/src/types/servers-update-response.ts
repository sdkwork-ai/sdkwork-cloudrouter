import type { ServersUpdateResult } from './servers-update-result';

export interface ServersUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
